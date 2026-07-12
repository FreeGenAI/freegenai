// ================================
// FreeGenAI - Firebase Authentication
// ================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEG1HqQvcwE-STfzd6A22A9BOK9F3wsqE",
  authDomain: "freegenai-a2b33.firebaseapp.com",
  projectId: "freegenai-a2b33",
  storageBucket: "freegenai-a2b33.firebasestorage.app",
  messagingSenderId: "946191747149",
  appId: "1:946191747149:web:4b37543181eb8fa1e53404",
  measurementId: "G-SVGKJ55Q16"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---------- Expose auth actions globally ----------
window.freegenaiAuth = {
  signup: (email, password) => createUserWithEmailAndPassword(auth, email, password),
  login: (email, password) => signInWithEmailAndPassword(auth, email, password),
  logout: () => signOut(auth)
};

// ---------- Track login state ----------
onAuthStateChanged(auth, (user) => {
  window.freegenaiUser = user;
  localStorage.setItem("freegenai_logged_in", user ? "true" : "false");
  updateLoginButton(user);
});

function updateLoginButton(user) {
  const btn = document.querySelector(".login-btn");
  if (!btn) return;

  if (user) {
    btn.textContent = "Logout";
    btn.onclick = () => window.freegenaiAuth.logout();
  } else {
    btn.textContent = "Login";
    btn.onclick = () => openAuthModal();
  }
}

// ---------- Modal open/close ----------
function openAuthModal() {
  const modal = document.getElementById("freegenai-auth-modal");
  if (modal) modal.style.display = "flex";
}

function closeAuthModal() {
  const modal = document.getElementById("freegenai-auth-modal");
  if (modal) modal.style.display = "none";
}

// ---------- Wire up modal form ----------
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("auth-modal-close");
  const signupBtn = document.getElementById("auth-signup-btn");
  const loginBtn = document.getElementById("auth-login-btn");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const errorMsg = document.getElementById("auth-error-msg");

  if (closeBtn) closeBtn.addEventListener("click", closeAuthModal);

  if (signupBtn) {
    signupBtn.addEventListener("click", async () => {
      errorMsg.textContent = "";
      try {
        await window.freegenaiAuth.signup(emailInput.value.trim(), passwordInput.value);
        closeAuthModal();
      } catch (err) {
        errorMsg.textContent = err.message.replace("Firebase: ", "");
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      errorMsg.textContent = "";
      try {
        await window.freegenaiAuth.login(emailInput.value.trim(), passwordInput.value);
        closeAuthModal();
      } catch (err) {
        errorMsg.textContent = err.message.replace("Firebase: ", "");
      }
    });
  }
});
