import { withDeadline } from './deadline.js';
let auth;
let ready;
export function firebaseSettings() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}
export const authConfigured = () =>
  Object.values(firebaseSettings()).every((v) => typeof v === 'string' && v.length > 0);
export async function getFirebaseAuth() {
  if (!authConfigured()) throw new Error('FIREBASE_CONFIG_REQUIRED');
  if (!ready)
    ready = withDeadline(
      (async () => {
        const [{ initializeApp }, { getAuth, setPersistence, browserSessionPersistence }] =
          await Promise.all([import('firebase/app'), import('firebase/auth')]);
        auth = getAuth(initializeApp(firebaseSettings()));
        await setPersistence(auth, browserSessionPersistence);
        await auth.authStateReady();
        return auth;
      })(),
      15000,
      'AUTH_INIT_TIMEOUT',
    ).catch((error) => {
      ready = undefined;
      throw error;
    });
  return ready;
}
export async function loginGoogle() {
  const instance = await getFirebaseAuth();
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  return signInWithPopup(instance, new GoogleAuthProvider());
}
export async function logoutGoogle() {
  if (auth) {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  }
}
export async function idToken() {
  const instance = await getFirebaseAuth();
  if (!instance.currentUser) throw new Error('LOGIN_REQUIRED');
  return instance.currentUser.getIdToken();
}
