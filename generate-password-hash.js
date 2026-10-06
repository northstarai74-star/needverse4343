#!/usr/bin/env node
/**
 * Utility to generate bcrypt password hashes for ADMIN_PASSWORD
 *
 * Usage:
 *   node generate-password-hash.js
 *
 * You'll be prompted to enter a password, and the bcrypt hash will be printed.
 * Copy this hash to your .env file as ADMIN_PASSWORD.
 */

const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🔐 Needverse Admin Password Hash Generator\n");
console.log("Enter a strong password (32+ characters, mixed case, numbers, symbols):\n");

rl.question("Password: ", async (password) => {
  if (!password) {
    console.error("\n❌ Password cannot be empty");
    process.exit(1);
  }

  if (password.length < 12) {
    console.warn("\n⚠️  Warning: Password is less than 12 characters. Recommend 32+ for production.\n");
  }

  try {
    console.log("\n⏳ Generating hash (this takes a few seconds)...\n");
    const hash = await bcrypt.hash(password, 12);

    console.log("✅ Hash generated successfully!\n");
    console.log("Copy this line to your .env file:\n");
    console.log(`ADMIN_PASSWORD=${hash}\n`);
    console.log("⚠️  Important: Keep this hash safe. Do not commit it to version control.\n");
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }

  rl.close();
});
