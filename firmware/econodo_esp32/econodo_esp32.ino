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
// ESTADO Y TIMER
// ----------------------------------------------------------------

unsigned long ultimoEnvio = 0;

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
  v_presion     = bme.pressure / 100.0;   // Pa → hPa
  v_voc         = bme.gas_resistance / 1000.0; // Ohm → kOhm
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

  v_pm25 = ((pm25High * 256) + pm25Low) / 10.0;
  v_pm10 = ((pm10High * 256) + pm10Low) / 10.0;
}

// ----------------------------------------------------------------
// ENVÍO A SUPABASE
// ----------------------------------------------------------------

void enviarLectura() {
  reconectarWifi();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Sin Wi-Fi, envío cancelado.");
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
      // Cualquier respuesta HTTP (201, 400, 401, 500, ...) detiene los reintentos
      String respuesta = http.getString();
      Serial.printf("[HTTP] Código: %d — %s\n", httpCode, respuesta.c_str());
      http.end();
      return;
    }

    // httpCode <= 0 → error de conexión: sí se reintenta
    Serial.printf("[HTTP] Error de conexión: %s\n", http.errorToString(httpCode).c_str());
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

  // Conectar Wi-Fi
  Serial.print("Conectando a Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi OK. IP: " + WiFi.localIP().toString());

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
  Serial.println("=== Sistema listo. Primer envío en " + String(INTERVALO_ENVIO_MS / 1000) + " segundos ===\n");
}

// ----------------------------------------------------------------
// LOOP
// ----------------------------------------------------------------

void loop() {
  // Leer sensores en cada ciclo
  leerBME680();
  leerSDS011();

  // Enviar cada INTERVALO_ENVIO_MS sin bloquear
  unsigned long ahora = millis();
  if (ahora - ultimoEnvio >= INTERVALO_ENVIO_MS) {
    ultimoEnvio = ahora;
    enviarLectura();
  }
}
