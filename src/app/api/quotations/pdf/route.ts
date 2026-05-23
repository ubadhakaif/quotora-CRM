import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url)
    const quotationId = searchParams.get('id')

    if (!quotationId) {
      return NextResponse.json({ error: 'Quotation ID parameter is required' }, { status: 400 })
    }

    // Since we are running in Next.js App Router, let's create a server client to retrieve quotation
    const supabase = createClient()

    const { data: quote, error } = await supabase
      .from('quotations')
      .select('*, customers(name, phone, email), branches(name, code), variants(name, price, models(name)), selected_fuel:fuel_types(name), selected_trans:transmission_types(name), quotation_accessories(price, accessories(name))')
      .eq('id', quotationId)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: `Quotation not found: ${error?.message || ''}` }, { status: 404 })
    }

    const breakdown = (quote.tax_breakdown as any) || {}
    const exShowroom = Number(breakdown.ex_showroom || quote.variants?.price || 0)
    
    const isLegacy = !breakdown.ex_showroom
    const gst = isLegacy ? Math.round(exShowroom * 0.28) : Number(breakdown.gst || 0)
    const tcs = isLegacy ? (exShowroom >= 1000000 ? Math.round(exShowroom * 0.01) : 0) : Number(breakdown.tcs || 0)
    const roadTax = isLegacy ? Math.round(exShowroom * 0.10) : Number(breakdown.road_tax || 0)
    const rtoFee = isLegacy ? Math.round(exShowroom * 0.02) : Number(breakdown.rto_fee || 0)
    const insurance = isLegacy ? Math.round(exShowroom * 0.03) : Number(breakdown.insurance || 0)
    
    const accs = quote.quotation_accessories || []
    const accessoriesTotal = isLegacy
      ? accs.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0)
      : Number(breakdown.accessories || 0)
      
    const finalPrice = Math.round(quote.total_price)

    // Build absolute high-fidelity HTML printing document template
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Official Vehicle Quotation - #${quote.id.slice(0, 8).toUpperCase()}</title>
        <style>
          body {
            font-family: 'Inter', system-ui, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 24px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.05em;
            color: #0f172a;
          }
          .meta-title {
            font-size: 28px;
            font-weight: 300;
            margin: 0;
            color: #0f172a;
          }
          .meta-sub {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          .section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 700;
            color: #94a3b8;
            margin-bottom: 8px;
          }
          .details-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
          }
          .details-name {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
          }
          .details-text {
            font-size: 13px;
            color: #475569;
            margin-top: 4px;
          }
          .vehicle-card {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 40px;
          }
          .vehicle-model {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
          }
          .vehicle-variant {
            font-size: 13px;
            color: #94a3b8;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 13px;
          }
          th {
            border-bottom: 2px solid #e2e8f0;
            text-align: left;
            padding: 12px 8px;
            color: #475569;
            font-weight: 600;
          }
          td {
            border-bottom: 1px solid #f1f5f9;
            padding: 12px 8px;
            color: #334155;
          }
          .text-right {
            text-align: right;
          }
          .font-semibold {
            font-weight: 600;
          }
          .total-row {
            font-size: 16px;
            font-weight: 700;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            color: #0f172a;
          }
          .total-row td {
            padding: 18px 8px;
          }
          .discount-text {
            color: #16a34a;
            font-weight: 600;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">QUOTORA</div>
            <h1 class="meta-title">VEHICLE QUOTATION</h1>
            <div class="meta-sub">Official Dealership Price Summary</div>
          </div>
          <div class="text-right">
            <div class="font-semibold" style="font-size: 14px;">Quotation ID: #${quote.id.slice(0, 8).toUpperCase()}</div>
            <div class="meta-sub">Date: ${new Date(quote.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div class="meta-sub">Branch: ${quote.branches?.name || 'Main Dealership'}</div>
          </div>
        </div>

        <div class="details-grid">
          <div>
            <div class="section-title">Customer Details</div>
            <div class="details-card">
              <div class="details-name">${quote.customers?.name || 'Valued Customer'}</div>
              <div class="details-text">Phone: ${quote.customers?.phone || 'N/A'}</div>
              <div class="details-text">Email: ${quote.customers?.email || 'N/A'}</div>
            </div>
          </div>
          <div>
            <div class="section-title">Dealership Entity</div>
            <div class="details-card">
              <div class="details-name">Quotora Automotive Systems</div>
              <div class="details-text">Branch Code: ${quote.branches?.code || 'MAIN'}</div>
              <div class="details-text">Authorized Corporate Quote</div>
            </div>
          </div>
        </div>

        <div class="section-title">Selected Specification</div>
        <div class="vehicle-card">
          <h2 class="vehicle-model">${quote.variants?.models?.name || 'Automobile Model'}</h2>
          <div class="vehicle-variant">${quote.variants?.name || 'Standard Edition'}</div>
          ${quote.selected_fuel?.name || quote.selected_trans?.name ? `
            <div style="margin-top: 10px; display: flex; gap: 8px;">
              ${quote.selected_fuel?.name ? `<span style="background-color: rgba(255,255,255,0.2); font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px; color: #ffffff;">⛽ ${quote.selected_fuel.name}</span>` : ''}
              ${quote.selected_trans?.name ? `<span style="background-color: rgba(255,255,255,0.2); font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px; color: #ffffff;">⚙️ ${quote.selected_trans.name}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="section-title">Pricing & Statutory Cost Matrix</div>
        <table>
          <thead>
            <tr>
              <th>Charge Component Description</th>
              <th class="text-right">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ex-Showroom Base Catalog Price</td>
              <td class="text-right">${exShowroom.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
            </tr>
            <tr>
              <td>GST Statutory Tax (28%)</td>
              <td class="text-right">+ ${gst.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
            </tr>
            ${tcs > 0 ? `
            <tr>
              <td>Tax Collected at Source (TCS 1%)</td>
              <td class="text-right">+ ${tcs.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
            </tr>
            ` : ''}
            <tr>
              <td>Road Tax & State Charges (10%)</td>
              <td class="text-right">+ ${roadTax.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
            </tr>
            <tr>
              <td>RTO & Registration Fees (2%)</td>
              <td class="text-right">+ ${rtoFee.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
            </tr>
            <tr>
              <td>Comprehensive Motor Insurance (4%)</td>
              <td class="text-right">+ ${insurance.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
            </tr>
            ${accs.length > 0 ? `
            <tr>
              <td class="font-semibold">Optional Accessories Included:
                <div style="font-size: 11px; font-weight: normal; color: #64748b; margin-top: 4px;">
                  ${accs.map((a: any) => `• ${a.accessories?.name || 'Accessory Item'} (${(Number(a.price) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })})`).join('<br/>')}
                </div>
              </td>
              <td class="text-right font-semibold" style="vertical-align: top;">
                + ${accessoriesTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
              </td>
            </tr>
            ` : ''}
            ${quote.discount_amount > 0 ? `
            <tr class="discount-text">
              <td>Dealership Concession Discount Applied (${quote.discount_percent}%) ${
                breakdown.discount_base_option === 'with_acc' ? '(With Accessories)' : '(Without Accessories)'
              }</td>
              <td class="text-right">- ${Number(quote.discount_amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>TOTAL ON-ROAD NET PAYABLE PROJECTION</td>
              <td class="text-right">${finalPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
            </tr>
          </tbody>
        </table>

        ${breakdown.finance?.include_loan ? `
        <div style="margin-top: 30px;">
          <div class="section-title" style="font-weight: 700;">Integrated Finance & Loan Option</div>
          <div class="details-card" style="padding: 0; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <table style="margin: 0; font-size: 12px; width: 100%;">
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Loan Tenure</td>
                <td style="padding: 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Interest Rate (P.A.)</td>
                <td style="padding: 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Downpayment Paid</td>
                <td style="padding: 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Monthly Installment (EMI)</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${breakdown.finance.tenure_months} Months</td>
                <td style="padding: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${breakdown.finance.interest_rate}%</td>
                <td style="padding: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${Number(breakdown.finance.down_payment).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                <td style="padding: 12px; color: #16a34a; font-weight: 700; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${Number(breakdown.finance.monthly_emi).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}/mo</td>
              </tr>
              <tr style="background-color: #fafafa; font-size: 11px;">
                <td colspan="2" style="padding: 10px 12px; color: #64748b; border: none;">Processing Fee (${breakdown.finance.processing_fee > 0 ? 'Applied' : 'Nil'}): <strong>${Number(breakdown.finance.processing_fee || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</strong></td>
                <td colspan="2" style="padding: 10px 12px; color: #64748b; text-align: right; border: none;">Total Interest Payable: <strong>${Number(breakdown.finance.total_interest || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</strong></td>
              </tr>
            </table>
          </div>
        </div>
        ` : ''}

        ${quote.notes ? `
        <div style="margin-top: 30px;">
          <div class="section-title">Special Quotation Remarks</div>
          <div class="details-card" style="font-size: 12px; color: #475569; font-style: italic; line-height: 1.6;">
            "${quote.notes}"
          </div>
        </div>
        ` : ''}

        <div class="footer">
          This is an official computer-generated quotation document valid for 15 calendar days from the date of printing.<br/>
          All prices and statutory taxes are subject to change as per regulatory declarations.
        </div>
      </body>
      </html>
    `

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
