const nodemailer = require("nodemailer");
const { STORE, byId } = require("./public/catalog.js");

const { SMTP_HOST, SMTP_PORT = 587, SMTP_USER, SMTP_PASS, MAIL_FROM, OWNER_EMAIL } = process.env;
const enabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transport = enabled
  ? nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), secure: Number(SMTP_PORT) === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => STORE.symbol + Number(n).toLocaleString("en-IN", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

function body(o, forOwner) {
  const rows = Object.entries(o.cart).map(([id, q]) => {
    const p = byId(Number(id));
    return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(p.name)} × ${q}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(p.price * q)}</td></tr>`;
  }).join("");
  const c = o.customer;
  const v = o.vehicle ? `<p style="margin:0 0 14px;color:#555">Vehicle: ${esc(o.vehicle.year)} ${esc(o.vehicle.make)} ${esc(o.vehicle.model)}</p>` : "";
  const heading = forOwner ? `New paid order ${esc(o.ref)}` : `Thanks ${esc(c.name.split(" ")[0])}, your order is confirmed`;
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#ff4d1a;color:#fff;padding:18px 24px;font-size:22px;font-weight:bold">Needverse</div>
  <div style="padding:24px;border:1px solid #eee;border-top:0">
    <h2 style="margin:0 0 6px">${heading}</h2>
    <p style="margin:0 0 14px;color:#555">Order <b>${esc(o.ref)}</b> · Payment ID ${esc(o.paymentId)}</p>
    ${v}
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
      <tr><td style="padding:12px 0 0;font-weight:bold">Total paid</td><td style="padding:12px 0 0;text-align:right;font-weight:bold">${money(o.amount)}</td></tr></table>
    <h3 style="margin:24px 0 6px">Shipping to</h3>
    <p style="margin:0;color:#333;line-height:1.5">${esc(c.name)}<br>${esc(c.addr)}<br>${esc(c.city)} ${esc(c.zip)}<br>${esc(c.phone)}${forOwner ? `<br>${esc(c.email)}` : ""}</p>
    <p style="margin:24px 0 0;color:#777;font-size:12px">Questions? Just reply to this email.</p>
  </div></div>`;
}

async function sendOrderEmails(o) {
  if (!enabled) { console.log(`(email skipped: SMTP not configured) order ${o.ref}`); return false; }
  const from = MAIL_FROM || SMTP_USER;
  await transport.sendMail({ from, to: o.customer.email, subject: `Order ${o.ref} confirmed`, html: body(o, false) });
  if (OWNER_EMAIL) await transport.sendMail({ from, to: OWNER_EMAIL, subject: `New order ${o.ref} (${money(o.amount)})`, html: body(o, true), replyTo: o.customer.email });
  return true;
}

function shippedBody(o) {
  const c = o.customer, t = o.tracking || {};
  const items = Object.entries(o.cart).map(([id, q]) => `<li>${esc(byId(Number(id))?.name)} × ${q}</li>`).join("");
  const safeUrl = /^https?:\/\//i.test(t.url || "") ? t.url : "";
  const track = (t.carrier || t.number)
    ? `<div style="background:#f6f6f6;border-radius:8px;padding:14px 16px;margin:16px 0">
        ${t.carrier ? `<div>Courier: <b>${esc(t.carrier)}</b></div>` : ""}
        ${t.number ? `<div>Tracking number: <b>${esc(t.number)}</b></div>` : ""}
        ${safeUrl ? `<div style="margin-top:12px"><a href="${esc(safeUrl)}" style="background:#ff4d1a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Track your package</a></div>` : ""}
      </div>` : "";
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#ff4d1a;color:#fff;padding:18px 24px;font-size:22px;font-weight:bold">Needverse</div>
  <div style="padding:24px;border:1px solid #eee;border-top:0">
    <h2 style="margin:0 0 6px">Your order is on its way 🚚</h2>
    <p style="margin:0 0 6px;color:#555">Hi ${esc(c.name.split(" ")[0])}, order <b>${esc(o.ref)}</b> has shipped.</p>
    ${track}
    <h3 style="margin:20px 0 6px">In this package</h3>
    <ul style="margin:0;padding-left:20px;line-height:1.7">${items}</ul>
    <h3 style="margin:20px 0 6px">Delivering to</h3>
    <p style="margin:0;color:#333;line-height:1.5">${esc(c.name)}<br>${esc(c.addr)}<br>${esc(c.city)} ${esc(c.zip)}</p>
    <p style="margin:24px 0 0;color:#777;font-size:12px">Something wrong? Just reply to this email.</p>
  </div></div>`;
}

async function sendShippedEmail(o) {
  if (!enabled) { console.log(`(email skipped: SMTP not configured) shipped ${o.ref}`); return false; }
  await transport.sendMail({ from: MAIL_FROM || SMTP_USER, to: o.customer.email, subject: `Your order ${o.ref} has shipped`, html: shippedBody(o), replyTo: OWNER_EMAIL || undefined });
  return true;
}

function refundBody(o, r) {
  const left = Math.round((o.amount - (o.refunded || 0)) * 100) / 100;
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#ff4d1a;color:#fff;padding:18px 24px;font-size:22px;font-weight:bold">Needverse</div>
  <div style="padding:24px;border:1px solid #eee;border-top:0">
    <h2 style="margin:0 0 6px">Your refund of ${money(r.amount)} is on its way</h2>
    <p style="margin:0 0 14px;color:#555">Hi ${esc(o.customer.name.split(" ")[0])}, we've refunded part or all of order <b>${esc(o.ref)}</b> to your original payment method.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Refund amount</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right"><b>${money(r.amount)}</b></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Order total</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(o.amount)}</td></tr>
      ${left > 0 ? `<tr><td style="padding:8px 0">Not refunded</td><td style="padding:8px 0;text-align:right">${money(left)}</td></tr>` : ""}
    </table>
    ${r.reason ? `<p style="margin:16px 0 0;color:#555">Note: ${esc(r.reason)}</p>` : ""}
    <p style="margin:16px 0 0;color:#333">Banks usually take <b>5 to 7 working days</b> to show the money in your account. UPI and wallet refunds are often faster.</p>
    <p style="margin:24px 0 0;color:#777;font-size:12px">Questions? Just reply to this email.</p>
  </div></div>`;
}

async function sendRefundEmail(o, r) {
  if (!enabled) { console.log(`(email skipped: SMTP not configured) refund ${o.ref}`); return false; }
  await transport.sendMail({ from: MAIL_FROM || SMTP_USER, to: o.customer.email, subject: `Refund for order ${o.ref}`, html: refundBody(o, r), replyTo: OWNER_EMAIL || undefined });
  return true;
}

module.exports = { sendOrderEmails, sendShippedEmail, sendRefundEmail, emailEnabled: enabled, body, shippedBody, refundBody };
