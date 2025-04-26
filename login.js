import { users } from './BDTrabajadores.js';

// Lógica principal de login
function login(rut, pin) {
  const usuarioEncontrado = users.find(user => user.rut === rut && user.pin === pin);

  if (usuarioEncontrado) {
    localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioEncontrado));
    window.location.href = 'index.html'; // Avanzamos a index.html
  } else {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = 'RUT o PIN incorrectos.';
  }
}

// Función que captura lo ingresado en los inputs
function handleLogin() {
  const rut = document.getElementById('rut').value.trim();
  const pin = document.getElementById('pin').value.trim();
  const errorDiv = document.getElementById('error');

  if (rut === '' || pin === '') {
    errorDiv.textContent = 'Debe ingresar RUT y PIN.';
    return;
  }

  if (pin.length !== 4) {
    errorDiv.textContent = 'El PIN debe tener 4 dígitos.';
    return;
  }

  login(rut, pin);
}

// Expongo la función para que el HTML pueda usarla
window.handleLogin = handleLogin;
