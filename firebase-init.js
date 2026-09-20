// وحدة مشتركة: تهيئة Firebase + المصادقة + الأدوار
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCG3bBrP1SWia50pnH1VS9behJ80M4BA6U",
  authDomain: "tabuk-medical-cmms.firebaseapp.com",
  projectId: "tabuk-medical-cmms",
  storageBucket: "tabuk-medical-cmms.firebasestorage.app",
  messagingSenderId: "756624281363",
  appId: "1:756624281363:web:919e8555b86eddecbb14e6",
  measurementId: "G-YV56L9QR5J"
};

// يجب أن يطابق الإيميل الموجود في firestore.rules
export const ADMIN_EMAIL = "bioenga7md3del@gmail.com";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// تنظيف النصوص قبل إدخالها في innerHTML
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function currentUser() {
  return new Promise(resolve => {
    const off = onAuthStateChanged(auth, u => { off(); resolve(u); });
  });
}

// يرجع { role: 'admin' | 'manager', site, email } أو null
export async function getProfile(user) {
  if (!user || !user.email) return null;
  if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { role: "admin", site: null, email: user.email };
  }
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().role === "manager" && snap.data().site) {
      return { role: "manager", site: snap.data().site, email: user.email };
    }
  } catch (e) { console.error(e); }
  return null;
}

// حارس الصفحات: يسمح فقط بالأدوار المحددة وإلا يحوّل لصفحة الدخول
export async function requireRole(roles) {
  const user = await currentUser();
  const profile = await getProfile(user);
  if (!profile || !roles.includes(profile.role)) {
    const page = location.pathname.split("/").pop() || "index.html";
    location.replace("index.html?login=1&next=" + encodeURIComponent(page));
    return new Promise(() => {});
  }
  document.documentElement.style.visibility = "visible";
  return { user, profile };
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await getProfile(cred.user);
  if (!profile) {
    await signOut(auth);
    const err = new Error("no-role");
    err.code = "app/no-role";
    throw err;
  }
  return profile;
}

export async function logout() {
  await signOut(auth);
  location.href = "index.html";
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function authErrorMessage(e) {
  switch (e && e.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email": return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
    case "auth/too-many-requests": return "محاولات كثيرة، حاول لاحقاً";
    case "auth/network-request-failed": return "تعذر الاتصال بالشبكة";
    case "app/no-role": return "هذا الحساب غير مفعّل في النظام، تواصل مع الإدارة";
    default: return "تعذر تسجيل الدخول";
  }
}
