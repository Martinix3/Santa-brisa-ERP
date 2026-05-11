#!/usr/bin/env tsx

/**
 * Script to inspect warehouse-related Firestore collections
 * Usage: npx tsx scripts/inspect-warehouse-collections.ts
 */

import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin using the same method as src/server/firebase.ts
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error("❌ Error: projectId not defined");
  console.error("Set GCLOUD_PROJECT or FIREBASE_PROJECT_ID environment variable");
  process.exit(1);
}

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore(app);

async function inspectCollection(collectionName: string) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📦 COLLECTION: ${collectionName}`);
  console.log(`${"=".repeat(80)}\n`);

  try {
    const snapshot = await db.collection(collectionName).get();

    if (snapshot.empty) {
      console.log(`⚠️  Collection "${collectionName}" is EMPTY\n`);
      return;
    }

    console.log(`✅ Found ${snapshot.size} documents\n`);

    snapshot.docs.forEach((doc, index: number) => {
      const data = doc.data();
      console.log(`\n📄 Document ${index + 1}/${snapshot.size}: ${doc.id}`);
      console.log("-".repeat(80));
      console.log(JSON.stringify(data, null, 2));
    });

    console.log("\n");
  } catch (error: any) {
    console.error(`❌ Error reading collection "${collectionName}":`, error.message);
  }
}

async function main() {
  console.log("\n");
  console.log("🔍 WAREHOUSE COLLECTIONS INSPECTOR");
  console.log("=".repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("=".repeat(80));

  const collections = [
    "warehouseSuppliers",
    "goodsReceipts",
    "onHand",
    "stockMoves",
    "traceEvents",
  ];

  for (const collectionName of collections) {
    await inspectCollection(collectionName);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ INSPECTION COMPLETE");
  console.log("=".repeat(80) + "\n");

  // Analysis
  console.log("\n📊 ANALYSIS:\n");

  // Check SKU and lot number formats
  const goodsReceipts = await db.collection("goodsReceipts").get();
  if (!goodsReceipts.empty) {
    console.log("🔍 Checking SKU and Internal Lot formats in goodsReceipts:\n");
    
    goodsReceipts.docs.forEach((doc) => {
      const data = doc.data();
      if (data.lines && Array.isArray(data.lines)) {
        data.lines.forEach((line: any, index: number) => {
          console.log(`  Line ${index + 1}:`);
          console.log(`    SKU: ${line.sku || "N/A"} (length: ${(line.sku || "").length})`);
          console.log(`    Internal Lot: ${line.internalLot || "N/A"} (length: ${(line.internalLot || "").length})`);
          console.log(`    Product Name: ${line.productName || "N/A"}`);
          console.log("");
        });
      }
    });
  }

  const onHand = await db.collection("onHand").get();
  if (!onHand.empty) {
    console.log("🔍 Checking productName in onHand:\n");
    
    onHand.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  ${doc.id}:`);
      console.log(`    SKU: ${data.sku || "N/A"}`);
      console.log(`    itemId: ${data.itemId || "N/A"}`);
      console.log(`    productName: ${data.productName || "❌ MISSING"}`);
      console.log(`    lotNumber: ${data.lotNumber || "N/A"} (length: ${(data.lotNumber || "").length})`);
      console.log("");
    });
  }

  const stockMoves = await db.collection("stockMoves").get();
  if (!stockMoves.empty) {
    console.log("🔍 Checking productName in stockMoves:\n");
    
    stockMoves.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  ${doc.id}:`);
      console.log(`    SKU: ${data.sku || "N/A"}`);
      console.log(`    itemId: ${data.itemId || "N/A"}`);
      console.log(`    productName: ${data.productName || "❌ MISSING"}`);
      console.log(`    lotNumber: ${data.lotNumber || "N/A"} (length: ${(data.lotNumber || "").length})`);
      console.log("");
    });
  }

  process.exit(0);
}

main();
