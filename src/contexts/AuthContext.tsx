import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  registerWithEmailAndName: (email: string, pass: string, name: string) => Promise<User>;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user profile document inside firestore
        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || "Operator",
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn("Secure silent profile check failed (may be expected if rules restricts or offline):", err);
        }
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Sync layout details
      if (result.user) {
        const userDocRef = doc(db, "users", result.user.uid);
        try {
          await setDoc(userDocRef, {
            uid: result.user.uid,
            email: result.user.email || "",
            displayName: result.user.displayName || "Operator",
            createdAt: new Date().toISOString(),
          });
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${result.user.uid}`);
        }
      }
      return result.user;
    } catch (err) {
      console.error("Google Popup Auth failure:", err);
      throw err;
    }
  };

  const registerWithEmailAndName = async (email: string, pass: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        // Update profile display name inside auth profile
        await updateProfile(result.user, { displayName: name });
        
        // Write the corresponding user profile document in Firestore
        const userDocRef = doc(db, "users", result.user.uid);
        try {
          await setDoc(userDocRef, {
            uid: result.user.uid,
            email: result.user.email || "",
            displayName: name,
            createdAt: new Date().toISOString(),
          });
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${result.user.uid}`);
        }
      }
      return result.user;
    } catch (err) {
      console.error("Email registration failure:", err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return result.user;
    } catch (err) {
      console.error("Email login failure:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign-out failure:", err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      console.error("Password reset failure:", err);
      throw err;
    }
  };

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    registerWithEmailAndName,
    loginWithEmail,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
