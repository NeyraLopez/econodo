// ================================================================
// EcoNodo ESP32 — Fase 3
// Lee sensores BME680 (SPI) + SDS011 (UART) y envía lecturas
// a la Edge Function de Supabase cada INTERVALO_ENVIO_MS ms.
// ================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <Adafruit_Sensor.h>
#include "Adafruit_BME680.h"
#include "secrets.h"  // Copia secrets.example.h → secrets.h y rellena valores reales

// ----------------------------------------------------------------
// LCD — Pantalla LCD 1602A paralela (HD44780), modo 4 bits
//
// Libreria: LiquidCrystal (incluida en Arduino IDE, no requiere instalacion adicional)
//
// Conexion fisica:
//   LCD GND/VSS → GND
//   LCD VDD     → 5V
//   LCD VO      → pin central del potenciometro B100K (extremos a 5V y GND)
//   LCD RS      → GPIO13
//   LCD RW      → GND (modo solo escritura, conectar directo a GND)
//   LCD E       → GPIO14
//   LCD D0-D3   → sin conectar (modo 4 bits no los usa)
//   LCD D4      → GPIO25
//   LCD D5      → GPIO26
//   LCD D6      → GPIO27
//   LCD D7      → GPIO32
//   LCD A/LED+  → 5V (idealmente con resistencia limitadora de 33-100 ohm)
//   LCD K/LED-  → GND
//
// Si la pantalla prende pero no muestra texto:
//   Ajustar el potenciometro de contraste conectado a VO.
// ----------------------------------------------------------------
#include <LiquidCrystal.h>

const bool    USAR_LCD = true;
const uint8_t LCD_COLS = 16;
const uint8_t LCD_ROWS = 2;
const uint8_t LCD_RS   = 13;
const uint8_t LCD_E    = 14;
const uint8_t LCD_D4   = 25;
const uint8_t LCD_D5   = 26;
const uint8_t LCD_D6   = 27;
const uint8_t LCD_D7   = 32;

LiquidCrystal lcd(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);

// ----------------------------------------------------------------
// CONFIGURACIÓN — CAMBIAR EN secrets.h, NO AQUÍ
// ----------------------------------------------------------------

// Identificador único del nodo (no es un secreto, puede estar aquí)
const char* NODO_ID = "ECONODO_001";

// URL de la Edge Function
const char* SUPABASE_FUNCTION_URL =
  "https://qqpnzclvyrnwxgwfkuox.supabase.co/functions/v1/ingest-lectura";

// Cada cuántos milisegundos enviar una lectura (30 segundos)
const unsigned long INTERVALO_ENVIO_MS = 30000;

// ----------------------------------------------------------------
// PINES
// ----------------------------------------------------------------

// SDS011 — sensor de polvo (PM2.5 / PM10) via UART
//   SDS011 TX  → ESP32 GPIO16 (RX2)
//   SDS011 RX  → ESP32 GPIO17 (TX2)
//   SDS011 VCC → 5V del shield (el sensor requiere 5V; los pines UART son 3.3V-compatible)
//   SDS011 GND → GND común
#define SDS_RX 16
#define SDS_TX 17

// BME680 — sensor de clima y gases via SPI
//   BME680 SCL/SCK → ESP32 GPIO18
//   BME680 SDO/MISO → ESP32 GPIO19
//   BME680 SDA/MOSI → ESP32 GPIO23
//   BME680 CS       → ESP32 GPIO5
//   BME680 VCC → 3.3V (salvo que el módulo incluya regulador propio que soporte 5V)
//   BME680 GND → GND común
#define BME_SCK  18
#define BME_MISO 19
#define BME_MOSI 23
#define BME_CS    5

// NOTA: todos los módulos deben compartir el mismo GND con el ESP32.

// ----------------------------------------------------------------
// OBJETOS
// ----------------------------------------------------------------

Adafruit_BME680 bme(BME_CS, BME_MOSI, BME_MISO, BME_SCK);

// ----------------------------------------------------------------
// VARIABLES DE LECTURA
// ----------------------------------------------------------------

float v_temperatura = 0.0;
float v_humedad     = 0.0;
float v_presion     = 0.0;
float v_voc         = 0.0;
float v_pm25        = 0.0;
float v_pm10        = 0.0;

// ----------------------------------------------------------------
// ESTADO Y TIMERS
// ----------------------------------------------------------------

unsigned long ultimoEnvio = 0;

// Flags: indican si ya hubo al menos una lectura válida de cada sensor
bool bmeListo = false;
bool sdsListo = false;

// Último código HTTP recibido (0 = sin envío aún)
int ultimoCodigoHTTP = 0;

// ─── LCD: marquee continuo — todas las páginas desplazan horizontalmente ─────
//
// LCD_SCROLLING: avanza offset un carácter cada INTERVALO_MARQUEE_LCD_MS ms.
// LCD_PAUSA:     espera PAUSA_ENTRE_PAGINAS_LCD_MS y luego cambia de página.
//
// Cada texto se extiende con LCD_COLS espacios al inicio y al final para que
// entre desde la derecha y salga limpio por la izquierda (efecto marquee puro).
//
const int LCD_SCROLLING = 0;
const int LCD_PAUSA     = 1;

const int  TOTAL_PAGINAS_LCD                    = 10;
const unsigned long INTERVALO_MARQUEE_LCD_MS    = 280;  // ms entre cada paso de marquee
const unsigned long PAUSA_ENTRE_PAGINAS_LCD_MS  = 500;  // ms de pausa entre páginas

int           paginaLCD              = 0;
int           offsetMarqueeLCD       = 0;
int           maxOffsetMarqueeLCD    = 0;
int           estadoMarqueeLCD       = LCD_SCROLLING;
String        lcdLinea1              = "";
String        lcdLinea2              = "";
String        lcdLinea1Ext           = "";
String        lcdLinea2Ext           = "";
unsigned long ultimoCambioMarqueeLCD = 0;
unsigned long inicioPaginaLCD        = 0;

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------

// Deriva calidad_aire del PM2.5 (valor directo en μg/m³)
float calcularCalidadAire() {
  return v_pm25;
}

// Deriva estado según umbrales definidos en app.js
const char* calcularEstado(float calidad_aire) {
  if (calidad_aire > 150.0) return "Critico";
  if (calidad_aire > 100.0) return "Malo";
  if (calidad_aire > 50.0)  return "Moderado";
  return "Bueno";
}

// Reconectar Wi-Fi si se pierde la conexión
void reconectarWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Wi-Fi perdido, reconectando");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Reconectado. IP: " + WiFi.localIP().toString());
  } else {
    Serial.println(" No se pudo reconectar.");
  }
}

// ----------------------------------------------------------------
// LCD — FUNCIONES BASE
// ----------------------------------------------------------------

// Imprime texto en una fila y rellena el resto con espacios
// para borrar caracteres residuales de impresiones anteriores.
void imprimirLCDLinea(uint8_t fila, const String& texto) {
  if (!USAR_LCD) return;
  lcd.setCursor(0, fila);
  lcd.print(texto);
  int restantes = LCD_COLS - (int)texto.length();
  for (int i = 0; i < restantes; i++) lcd.print(' ');
}

// Rellena una fila completa con espacios.
void limpiarLineaLCD(uint8_t fila) {
  if (!USAR_LCD) return;
  lcd.setCursor(0, fila);
  for (uint8_t i = 0; i < LCD_COLS; i++) lcd.print(' ');
}

// Inicializa la pantalla en modo 4 bits y la limpia.
void inicializarLCD() {
  if (!USAR_LCD) return;
  lcd.begin(LCD_COLS, LCD_ROWS);
  lcd.clear();
  Serial.println("[LCD] Pantalla paralela 16x2 inicializada.");
  Serial.println("[LCD] RS=13 E=14 D4=25 D5=26 D6=27 D7=32");
  Serial.println("[LCD] Si no se ve texto, ajustar el potenciometro conectado a VO.");
}

// Muestra dos lineas fijas — usado durante el arranque.
void mostrarLCDInicio(const char* linea1, const char* linea2) {
  if (!USAR_LCD) return;
  imprimirLCDLinea(0, String(linea1));
  imprimirLCDLinea(1, String(linea2));
}

// ----------------------------------------------------------------
// LCD — HELPERS DE ESTADO (lenguaje simple para exposición)
// ----------------------------------------------------------------

const char* estadoTemperatura() {
  if (!bmeListo)              return "--";
  if (v_temperatura < 10.0)  return "Baja";
  if (v_temperatura <= 35.0) return "Normal";
  if (v_temperatura <= 40.0) return "Alta";
  return "Muy alta";
}

const char* estadoHumedad() {
  if (!bmeListo)         return "--";
  if (v_humedad < 20.0)  return "Baja";
  if (v_humedad <= 70.0) return "Normal";
  return "Alta";
}

const char* estadoPresion() {
  if (!bmeListo) return "--";
  return v_presion < 950.0 ? "Baja" : "Normal";
}

const char* estadoPolvoFino() {
  if (!sdsListo)       return "--";
  if (v_pm25 <= 15.0)  return "Bajo";
  if (v_pm25 <= 35.0)  return "Medio";
  return "Alto";
}

const char* estadoPolvoAmbiental() {
  if (!sdsListo)        return "--";
  if (v_pm10 <= 45.0)   return "Bajo";
  if (v_pm10 <= 100.0)  return "Medio";
  return "Alto";
}

const char* estadoGasesSimple() {
  const char* est = calcularEstado(calcularCalidadAire());
  if (strcmp(est, "Bueno") == 0 || strcmp(est, "Moderado") == 0) return "Normal";
  return "Alto";
}

// ----------------------------------------------------------------
// LCD — MARQUEE CONTINUO
// ----------------------------------------------------------------

// Agrega LCD_COLS espacios antes y después del texto para que
// entre desde la derecha y salga limpio por la izquierda.
String prepararTextoMarquee(const String& texto) {
  String pad = "";
  for (int i = 0; i < LCD_COLS; i++) pad += ' ';
  return pad + texto + pad;
}

// Devuelve exactamente LCD_COLS caracteres desde textoExtendido[offset].
String obtenerVentanaMarquee(const String& textoExtendido, int offset) {
  if (offset < 0) offset = 0;
  int maxOff = (int)textoExtendido.length() - LCD_COLS;
  if (maxOff < 0) maxOff = 0;
  if (offset > maxOff) offset = maxOff;
  String ventana = textoExtendido.substring(offset, offset + LCD_COLS);
  while ((int)ventana.length() < LCD_COLS) ventana += ' ';
  return ventana;
}

// Construye los textos de línea 1 y línea 2 para cada página.
// Usa lenguaje simple orientado al público general.
void obtenerContenidoPaginaLCD(int pagina, String &l1, String &l2) {
  switch (pagina) {
    case 0:
      l1 = "EcoNodo";
      l2 = "Monitor ambiental";
      break;
    case 1:
      l1 = bmeListo ? "Temperatura: " + String((int)v_temperatura) + " C" : "Temperatura: --";
      l2 = "Estado: " + String(estadoTemperatura());
      break;
    case 2:
      l1 = bmeListo ? "Humedad: " + String((int)v_humedad) + " %" : "Humedad: --";
      l2 = "Estado: " + String(estadoHumedad());
      break;
    case 3:
      l1 = bmeListo ? "Presion: " + String((int)v_presion) + " hPa" : "Presion: --";
      l2 = "Estado: " + String(estadoPresion());
      break;
    case 4:
      l1 = sdsListo ? "Polvo fino: " + String((int)v_pm25) : "Polvo fino: --";
      l2 = "Ref: " + String(estadoPolvoFino());
      break;
    case 5:
      l1 = sdsListo ? "Polvo ambiental: " + String((int)v_pm10) : "Polvo ambiental: --";
      l2 = "Ref: " + String(estadoPolvoAmbiental());
      break;
    case 6: {
      String gEst = String(estadoGasesSimple());
      l1 = "Gases: " + gEst;
      l2 = (gEst == "Normal") ? "Aire sin alerta" : "Revise aire";
      break;
    }
    case 7:
      l1 = "Calidad aire";
      l2 = (bmeListo || sdsListo) ? String(calcularEstado(calcularCalidadAire())) : "--";
      break;
    case 8:
      l1 = "Nube";
      l2 = ultimoCodigoHTTP == 0 ? "Sin envios aun" : "HTTP: " + String(ultimoCodigoHTTP);
      break;
    case 9:
      l1 = "Conexion WiFi";
      l2 = WiFi.status() == WL_CONNECTED ? "Conectado" : "Sin conexion";
      break;
    default:
      l1 = "EcoNodo";
      l2 = "";
      break;
  }
}

// Reinicia el marquee para la página actual y renderiza el primer frame.
void resetMarqueeLCD() {
  offsetMarqueeLCD      = 0;
  estadoMarqueeLCD      = LCD_SCROLLING;
  ultimoCambioMarqueeLCD = millis();

  obtenerContenidoPaginaLCD(paginaLCD, lcdLinea1, lcdLinea2);
  lcdLinea1Ext = prepararTextoMarquee(lcdLinea1);
  lcdLinea2Ext = prepararTextoMarquee(lcdLinea2);

  int maxOff1 = (int)lcdLinea1Ext.length() - LCD_COLS;
  int maxOff2 = (int)lcdLinea2Ext.length() - LCD_COLS;
  if (maxOff1 < 0) maxOff1 = 0;
  if (maxOff2 < 0) maxOff2 = 0;
  maxOffsetMarqueeLCD = max(maxOff1, maxOff2);

  imprimirLCDLinea(0, obtenerVentanaMarquee(lcdLinea1Ext, 0));
  imprimirLCDLinea(1, obtenerVentanaMarquee(lcdLinea2Ext, 0));
}

// Avanza a la siguiente página del carrusel y reinicia el marquee.
void cambiarPaginaLCD() {
  paginaLCD = (paginaLCD + 1) % TOTAL_PAGINAS_LCD;
  resetMarqueeLCD();
}

// Actualiza la LCD de forma no bloqueante.
// LCD_SCROLLING: avanza offset cada INTERVALO_MARQUEE_LCD_MS.
// LCD_PAUSA:     espera PAUSA_ENTRE_PAGINAS_LCD_MS y cambia página.
void actualizarLCD() {
  if (!USAR_LCD) return;

  unsigned long ahora = millis();

  switch (estadoMarqueeLCD) {

    case LCD_SCROLLING:
      if (ahora - ultimoCambioMarqueeLCD >= INTERVALO_MARQUEE_LCD_MS) {
        ultimoCambioMarqueeLCD = ahora;

        imprimirLCDLinea(0, obtenerVentanaMarquee(lcdLinea1Ext, offsetMarqueeLCD));
        imprimirLCDLinea(1, obtenerVentanaMarquee(lcdLinea2Ext, offsetMarqueeLCD));

        if (offsetMarqueeLCD >= maxOffsetMarqueeLCD) {
          estadoMarqueeLCD = LCD_PAUSA;
          inicioPaginaLCD  = ahora;
        } else {
          offsetMarqueeLCD++;
        }
      }
      break;

    case LCD_PAUSA:
      if (ahora - inicioPaginaLCD >= PAUSA_ENTRE_PAGINAS_LCD_MS) {
        cambiarPaginaLCD();
      }
      break;
  }
}

// ----------------------------------------------------------------
// LECTURA BME680
// ----------------------------------------------------------------

void leerBME680() {
  if (!bme.performReading()) {
    Serial.println("[BME680] Error al realizar lectura.");
    return;
  }
  // Filtro: bloquea lecturas corruptas (-131 °C)
  if (bme.temperature < -10.0 || bme.temperature > 80.0) {
    Serial.println("[BME680] Lectura corrupta bloqueada.");
    return;
  }
  v_temperatura = bme.temperature;
  v_humedad     = bme.humidity;
  v_presion     = bme.pressure / 100.0;        // Pa → hPa
  v_voc         = bme.gas_resistance / 1000.0; // Ohm → kOhm
  bmeListo      = true;
}

// ----------------------------------------------------------------
// LECTURA SDS011
// ----------------------------------------------------------------

void leerSDS011() {
  if (Serial2.available() < 10) return;

  if (Serial2.read() != 0xAA) return;
  if (Serial2.read() != 0xC0) return;

  uint8_t pm25Low  = Serial2.read();
  uint8_t pm25High = Serial2.read();
  uint8_t pm10Low  = Serial2.read();
  uint8_t pm10High = Serial2.read();

  Serial2.read(); // ID1
  Serial2.read(); // ID2
  Serial2.read(); // checksum

  if (Serial2.read() != 0xAB) return; // byte final inválido

  v_pm25   = ((pm25High * 256) + pm25Low) / 10.0;
  v_pm10   = ((pm10High * 256) + pm10Low) / 10.0;
  sdsListo = true;
}

// ----------------------------------------------------------------
// ENVÍO A SUPABASE
// ----------------------------------------------------------------

void enviarLectura() {
  reconectarWifi();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Sin Wi-Fi, envio cancelado.");
    return;
  }

  float calidad_aire = calcularCalidadAire();
  const char* estado = calcularEstado(calidad_aire);

  // Construir payload JSON
  String payload = "{";
  payload += "\"nodo_id\":\""      + String(NODO_ID)          + "\",";
  payload += "\"temperatura\":"    + String(v_temperatura, 2) + ",";
  payload += "\"humedad\":"        + String(v_humedad, 2)     + ",";
  payload += "\"presion\":"        + String(v_presion, 2)     + ",";
  payload += "\"voc\":"            + String(v_voc, 2)         + ",";
  payload += "\"pm25\":"           + String(v_pm25, 2)        + ",";
  payload += "\"pm10\":"           + String(v_pm10, 2)        + ",";
  payload += "\"calidad_aire\":"   + String(calidad_aire, 2)  + ",";
  payload += "\"estado\":\""       + String(estado)           + "\"";
  payload += "}";

  Serial.println("[HTTP] Enviando: " + payload);

  for (int intento = 1; intento <= 3; intento++) {
    Serial.printf("[HTTP] Intento %d/3...\n", intento);

    WiFiClientSecure client;
    client.setInsecure(); // Omite verificación de cert — aceptable para prototipo escolar

    HTTPClient http;
    http.setTimeout(10000);       // 10 s total para la respuesta
    http.setConnectTimeout(5000); // 5 s para el handshake TCP/TLS
    http.begin(client, SUPABASE_FUNCTION_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(NODO_SECRET_TOKEN));

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
      // Guardar código para mostrarlo en la LCD (página 8)
      ultimoCodigoHTTP = httpCode;
      String respuesta = http.getString();
      Serial.printf("[HTTP] Codigo: %d — %s\n", httpCode, respuesta.c_str());
      http.end();
      return;
    }

    // httpCode <= 0 → error de conexión: sí se reintenta
    Serial.printf("[HTTP] Error de conexion: %s\n", http.errorToString(httpCode).c_str());
    http.end();

    if (intento < 3) {
      Serial.println("[HTTP] Reintentando en 2s...");
      delay(2000);
    }
  }

  Serial.println("[HTTP] Fallaron los 3 intentos. Se omite este ciclo.");
}

// ----------------------------------------------------------------
// SETUP
// ----------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, SDS_RX, SDS_TX);

  Serial.println("\n=== EcoNodo ESP32 — Iniciando ===");

  // Inicializar LCD
  inicializarLCD();
  mostrarLCDInicio("EcoNodo", "Iniciando");

  // Conectar Wi-Fi
  Serial.print("Conectando a Wi-Fi");
  mostrarLCDInicio("EcoNodo", "WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi OK. IP: " + WiFi.localIP().toString());
  mostrarLCDInicio("EcoNodo", "WiFi OK");
  delay(800);

  // Iniciar BME680 via SPI
  if (!bme.begin()) {
    Serial.println("[BME680] ERROR: sensor no detectado. Verifica pines y jumpers.");
  } else {
    bme.setTemperatureOversampling(BME680_OS_8X);
    bme.setHumidityOversampling(BME680_OS_2X);
    bme.setPressureOversampling(BME680_OS_4X);
    bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
    bme.setGasHeater(320, 150);
    Serial.println("[BME680] OK.");
  }

  Serial.println("[SDS011] UART listo en pines RX=" + String(SDS_RX) + " TX=" + String(SDS_TX));

  mostrarLCDInicio("Sistema listo", NODO_ID);
  delay(1500);

  // Arrancar marquee desde página 0
  paginaLCD = 0;
  resetMarqueeLCD();

  Serial.println("=== Sistema listo. Primer envio en " + String(INTERVALO_ENVIO_MS / 1000) + " segundos ===\n");
}

// ----------------------------------------------------------------
// LOOP
// ----------------------------------------------------------------

void loop() {
  // Leer sensores en cada ciclo
  leerBME680();
  leerSDS011();

  // Actualizar LCD de forma no bloqueante
  actualizarLCD();

  // Enviar cada INTERVALO_ENVIO_MS sin bloquear
  unsigned long ahora = millis();
  if (ahora - ultimoEnvio >= INTERVALO_ENVIO_MS) {
    ultimoEnvio = ahora;
    enviarLectura();
  }
}
