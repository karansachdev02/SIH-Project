/**
 * bookingPdfService.js
 *
 * Generates a Smart Mandi booking slip PDF from a populated booking object.
 * Uses PDFKit (pure Node.js, no external API required).
 *
 * Usage:
 *   import { generateBookingSlipPdf } from './bookingPdfService.js'
 *   generateBookingSlipPdf(booking, res)  // res is the Express response stream
 */

import PDFDocument from 'pdfkit'

// ── Colour palette ─────────────────────────────────────────────────────────────
const C = {
  green:      '#1a7a4a',
  greenLight: '#e8f5ee',
  slate:      '#334155',
  muted:      '#64748b',
  border:     '#e2e8f0',
  black:      '#0f172a',
  white:      '#ffffff',
  amber:      '#b45309',
  amberBg:    '#fffbeb',
  rose:       '#be123c',
  roseBg:     '#fff1f2',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  })
}

function formatPrice(val) {
  const n = Number(val)
  if (!n || isNaN(n)) return '—'
  return '\u20B9' + n.toLocaleString('en-IN')          // ₹ as unicode escape
}

function shortId(id) {
  return 'SM-' + String(id).slice(-8).toUpperCase()
}

function statusLabel(status) {
  const map = { pending: 'PENDING', confirmed: 'CONFIRMED', completed: 'COMPLETED', cancelled: 'CANCELLED' }
  return map[status] || String(status).toUpperCase()
}

function statusColors(status) {
  if (status === 'confirmed')  return { bg: C.greenLight, fg: C.green }
  if (status === 'completed')  return { bg: C.greenLight, fg: C.green }
  if (status === 'cancelled')  return { bg: C.roseBg,     fg: C.rose  }
  return { bg: C.amberBg, fg: C.amber }
}

// ── Horizontal rule ────────────────────────────────────────────────────────────
function hrule(doc, y) {
  doc
    .save()
    .strokeColor(C.border)
    .lineWidth(0.5)
    .moveTo(40, y)
    .lineTo(555, y)
    .stroke()
    .restore()
}

// ── Section heading ────────────────────────────────────────────────────────────
function sectionHeading(doc, text, y) {
  doc
    .save()
    .rect(40, y, 515, 20)
    .fill(C.greenLight)
    .restore()
    .fillColor(C.green)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(text.toUpperCase(), 48, y + 5, { characterSpacing: 0.5 })
}

// ── Two-column row ─────────────────────────────────────────────────────────────
function row(doc, label, value, y) {
  doc
    .fillColor(C.muted)
    .font('Helvetica')
    .fontSize(9)
    .text(label, 48, y, { width: 160 })
    .fillColor(C.black)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(String(value ?? '—'), 215, y, { width: 340 })
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Pipe a booking-slip PDF into an Express response.
 *
 * @param {object} booking  Fully populated booking object (Mongoose lean or toObject)
 * @param {object} res      Express response object
 */
export function generateBookingSlipPdf(booking, res) {
  const doc = new PDFDocument({
    size:    'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    info: {
      Title:    'Smart Mandi Booking Slip',
      Author:   'Smart Mandi',
      Subject:  'Crop Pre-Booking Confirmation',
      Keywords: 'smart mandi, booking, crop, farmer, buyer',
    },
  })

  // ── Pipe directly to response ────────────────────────────────────────────────
  doc.pipe(res)

  const crop   = booking.crop   || {}
  const farmer = booking.farmer || {}
  const buyer  = booking.buyer  || {}

  // ── Page width reference ─────────────────────────────────────────────────────
  const PW = 515   // usable width (595 - 40 - 40)

  // ════════════════════════════════════════════════════════════════════════════
  // HEADER BANNER
  // ════════════════════════════════════════════════════════════════════════════
  doc
    .rect(40, 40, PW, 60)
    .fill(C.green)

  doc
    .fillColor(C.white)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('Smart Mandi', 55, 52)

  doc
    .fillColor('#a7f3d0')
    .font('Helvetica')
    .fontSize(9)
    .text('Crop Pre-Booking Slip', 55, 76)

  // Booking ref in top-right corner of banner
  doc
    .fillColor(C.white)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(shortId(booking._id || booking.id || ''), 0, 58, {
      align: 'right',
      width: 590,
    })

  // ════════════════════════════════════════════════════════════════════════════
  // STATUS PILL
  // ════════════════════════════════════════════════════════════════════════════
  const sc = statusColors(booking.status)
  const statusText = statusLabel(booking.status)
  const pillX = 40, pillY = 116
  doc
    .save()
    .rect(pillX, pillY, 100, 18)
    .fill(sc.bg)
    .restore()
    .fillColor(sc.fg)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(statusText, pillX + 4, pillY + 4, { width: 92, align: 'center', characterSpacing: 0.6 })

  // Generated date (right side)
  doc
    .fillColor(C.muted)
    .font('Helvetica')
    .fontSize(8)
    .text('Generated: ' + formatDate(new Date()), 0, pillY + 4, {
      align: 'right',
      width: 590,
    })

  // ════════════════════════════════════════════════════════════════════════════
  // BOOKING DETAILS
  // ════════════════════════════════════════════════════════════════════════════
  let cy = 148

  sectionHeading(doc, 'Booking Details', cy)
  cy += 28

  row(doc, 'Booking Reference', shortId(booking._id || booking.id || ''), cy);  cy += 16
  row(doc, 'Status',            statusLabel(booking.status),                 cy);  cy += 16
  row(doc, 'Quantity Booked',   `${booking.quantity} ${booking.quantityUnit || 'quintal'}`, cy); cy += 16
  row(doc, 'Agreed Price',      formatPrice(booking.agreedPrice),            cy);  cy += 16
  row(doc, 'Booked On',         formatDate(booking.createdAt),               cy);  cy += 16
  row(doc, 'Last Updated',      formatDate(booking.updatedAt),               cy);  cy += 16

  hrule(doc, cy + 2); cy += 14

  // ════════════════════════════════════════════════════════════════════════════
  // CROP INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeading(doc, 'Crop Information', cy)
  cy += 28

  row(doc, 'Crop Name',      crop.cropName  || '—',                                        cy);  cy += 16
  row(doc, 'Crop Type',      crop.cropType  || '—',                                        cy);  cy += 16
  row(doc, 'Avail. Quantity',`${crop.quantity ?? '—'} ${crop.quantityUnit || 'quintal'}`,  cy);  cy += 16
  row(doc, 'Expected Price', formatPrice(crop.expectedPrice),                              cy);  cy += 16
  row(doc, 'Location',       crop.location  || '—',                                        cy);  cy += 16
  row(doc, 'Crop Status',    crop.status    || '—',                                        cy);  cy += 16

  hrule(doc, cy + 2); cy += 14

  // ════════════════════════════════════════════════════════════════════════════
  // SELLER (FARMER) INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeading(doc, 'Seller Information', cy)
  cy += 28

  const farmerLoc = [farmer.village, farmer.district, farmer.state].filter(Boolean).join(', ')
  row(doc, 'Farmer Name',   farmer.name || '—',       cy);  cy += 16
  row(doc, 'Location',      farmerLoc   || '—',       cy);  cy += 16

  hrule(doc, cy + 2); cy += 14

  // ════════════════════════════════════════════════════════════════════════════
  // BUYER INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeading(doc, 'Buyer Information', cy)
  cy += 28

  const buyerLoc = [buyer.village, buyer.district, buyer.state].filter(Boolean).join(', ')
  row(doc, 'Buyer Name', buyer.name || '—',  cy);  cy += 16
  row(doc, 'Location',   buyerLoc   || '—',  cy);  cy += 16

  hrule(doc, cy + 2); cy += 14

  // ════════════════════════════════════════════════════════════════════════════
  // NOTES  (only render section if there is at least one note)
  // ════════════════════════════════════════════════════════════════════════════
  if (booking.buyerNote || booking.farmerNote) {
    sectionHeading(doc, 'Notes', cy)
    cy += 28

    if (booking.buyerNote) {
      doc
        .fillColor(C.muted)
        .font('Helvetica')
        .fontSize(8)
        .text('Buyer note:', 48, cy)
      cy += 12
      doc
        .fillColor(C.black)
        .font('Helvetica')
        .fontSize(9)
        .text(booking.buyerNote, 48, cy, { width: PW - 16 })
      cy += doc.heightOfString(booking.buyerNote, { width: PW - 16 }) + 8
    }

    if (booking.farmerNote) {
      doc
        .fillColor(C.muted)
        .font('Helvetica')
        .fontSize(8)
        .text('Farmer note:', 48, cy)
      cy += 12
      doc
        .fillColor(C.green)
        .font('Helvetica')
        .fontSize(9)
        .text(booking.farmerNote, 48, cy, { width: PW - 16 })
      cy += doc.heightOfString(booking.farmerNote, { width: PW - 16 }) + 8
    }

    hrule(doc, cy + 2); cy += 14
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DISCLAIMER
  // ════════════════════════════════════════════════════════════════════════════
  cy += 4
  doc
    .save()
    .rect(40, cy, PW, 1)
    .fill(C.border)
    .restore()

  cy += 8
  doc
    .fillColor(C.muted)
    .font('Helvetica')
    .fontSize(7.5)
    .text(
      'DISCLAIMER: This slip is a digital record of a pre-booking request made on Smart Mandi. ' +
      'It does not constitute a legally binding sale contract. Actual transaction terms are subject ' +
      'to mutual agreement between farmer and buyer. Smart Mandi is not responsible for disputes ' +
      'arising from transactions conducted outside the platform.',
      40, cy, { width: PW, align: 'justify' }
    )

  // ════════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════════════════════════════
  const footerY = 780
  doc
    .save()
    .strokeColor(C.border)
    .lineWidth(0.5)
    .moveTo(40, footerY)
    .lineTo(555, footerY)
    .stroke()
    .restore()
    .fillColor(C.muted)
    .font('Helvetica')
    .fontSize(7.5)
    .text('Smart Mandi \u2014 Connecting Farmers & Buyers', 40, footerY + 6, {
      width: PW / 2,
    })
    .text(
      'Printed: ' + new Date().toLocaleString('en-IN'),
      0, footerY + 6,
      { align: 'right', width: 590 }
    )

  // ── Finalise ─────────────────────────────────────────────────────────────────
  doc.end()
}
