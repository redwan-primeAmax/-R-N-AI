/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import { initializeApp, getApps, getApp } from '@firebase/app';
import { t as tr } from '../utils/translator';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from '@firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.appdata');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token from sign-in result');
    }
    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('gd_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('Google Sign In failed:', err);
    if (err?.code === 'auth/unauthorized-domain') {
      throw new Error(
        tr('auth.domain', { host: window.location.hostname })
      );
    } else if (err?.code === 'auth/popup-blocked') {
      throw new Error(tr('auth.popupBlocked'));
    } else if (err?.code === 'auth/popup-closed-by-user') {
      throw new Error(tr('auth.popupClosed'));
    }
    throw new Error(err?.message || tr('auth.signInFailed'));
  } finally {
    isSigningIn = false;
  }
};

export const getStoredAccessToken = (): string | null => {
  return cachedAccessToken || sessionStorage.getItem('gd_token');
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Signout error:', err);
  }
  cachedAccessToken = null;
  sessionStorage.removeItem('gd_token');
  localStorage.removeItem('gd_connected_user');
};
