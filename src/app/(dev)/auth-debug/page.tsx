"use client";
import { useData } from "@/lib/dataprovider";

export default function AuthDebugPage() {
  const { authReady, firebaseUser, currentUser, data } = useData();
  return (
    <div className="p-6 space-y-2 font-mono text-sm">
      <div>authReady: {String(authReady)}</div>
      <div>firebaseUser: {firebaseUser ? firebaseUser.uid : "null"}</div>
      <div>currentUser: {currentUser ? currentUser.name : "null"}</div>
      <div>has data?: {data ? "yes" : "no"}</div>
    </div>
  );
}
