import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1"

serve(async (req) => {
  try {
    const { pdfData, userPassword, ownerPassword, permissions } = await req.json()

    if (!pdfData || !userPassword) {
      return new Response(
        JSON.stringify({ error: 'PDF data and user password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Convert base64 PDF data to Uint8Array
    const pdfBytes = new Uint8Array(Buffer.from(pdfData, 'base64'))
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Check if PDF is already encrypted
    if (pdfDoc.isEncrypted) {
      return new Response(
        JSON.stringify({ error: 'PDF is already encrypted' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Apply encryption
    await pdfDoc.encrypt({
      userPassword,
      ownerPassword: ownerPassword || userPassword,
      permissions: {
        printing: permissions?.printing || 'highResolution',
        modifying: permissions?.modifying || false,
        copying: permissions?.copying || false,
        annotating: permissions?.annotating || false,
        fillingForms: permissions?.fillingForms || true,
        contentAccessibility: permissions?.contentAccessibility || true,
        documentAssembly: permissions?.documentAssembly || false
      }
    })

    // Save the encrypted PDF
    const encryptedPdfBytes = await pdfDoc.save()
    
    // Convert to base64 for response
    const encryptedPdfBase64 = Buffer.from(encryptedPdfBytes).toString('base64')

    return new Response(
      JSON.stringify({ 
        success: true, 
        encryptedPdf: encryptedPdfBase64 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } 
      }
    )

  } catch (error) {
    console.error('Encryption error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to encrypt PDF',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } 
      }
    )
  }
}) 