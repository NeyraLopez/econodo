(function () {
    var modal    = document.getElementById('modal-intro');
    var overlay  = document.getElementById('modal-overlay');
    var btnAbrir   = document.getElementById('btn-acerca');
    var btnCerrar  = document.getElementById('btn-cerrar-modal');
    var btnEmpezar = document.getElementById('btn-empezar');

    function abrir() {
        modal.classList.add('activo');
        document.body.style.overflow = 'hidden';
    }

    function cerrar() {
        modal.classList.remove('activo');
        document.body.style.overflow = '';
    }

    btnEmpezar.addEventListener('click', cerrar);
    btnCerrar.addEventListener('click', cerrar);
    btnAbrir.addEventListener('click', abrir);
    overlay.addEventListener('click', cerrar);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('activo')) cerrar();
    });
})();
