package com.bohr.bohrriles

import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.bohr.bohrriles.models.BarrilResponse
import kotlinx.coroutines.launch

class RecibirActivity : BaseBarrilActivity() {

    private lateinit var cardBarril: View
    private lateinit var tvNombreBarril: TextView
    private lateinit var tvCodBarril: TextView
    private lateinit var tvComercio: TextView
    private lateinit var tvFechaEntrega: TextView
    private lateinit var tvDias: TextView
    private lateinit var tvInstruccion: TextView
    private lateinit var btnEscanear: Button
    private lateinit var btnConfirmar: Button
    private lateinit var progressBar: ProgressBar

    private var barrilActual: BarrilResponse? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_recibir)
        session = SessionManager(this)

        cardBarril     = findViewById(R.id.cardBarril)
        tvNombreBarril = findViewById(R.id.tvNombreBarril)
        tvCodBarril    = findViewById(R.id.tvCodBarril)
        tvComercio     = findViewById(R.id.tvComercio)
        tvFechaEntrega = findViewById(R.id.tvFechaEntrega)
        tvDias         = findViewById(R.id.tvDias)
        tvInstruccion  = findViewById(R.id.tvInstruccion)
        btnEscanear    = findViewById(R.id.btnEscanear)
        btnConfirmar   = findViewById(R.id.btnConfirmar)
        progressBar    = findViewById(R.id.progressBar)

        btnEscanear.setOnClickListener { launchScanner() }
        btnConfirmar.setOnClickListener { confirmarDevolucion() }
    }

    override fun onScanResult(code: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.scanDevolver(code)
                if (resp.error.isNotEmpty()) {
                    Toast.makeText(this@RecibirActivity, resp.error, Toast.LENGTH_LONG).show()
                } else {
                    barrilActual = resp
                    showBarrilCard(resp)
                }
            } catch (e: Exception) {
                Toast.makeText(this@RecibirActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun showBarrilCard(b: BarrilResponse) {
        tvNombreBarril.text  = b.nombreBarril
        tvCodBarril.text     = b.codBarril
        tvComercio.text      = b.nombreComercio.ifEmpty { "—" }
        tvFechaEntrega.text  = b.fechaEntrega.ifEmpty { "—" }
        tvDias.text          = if (b.cantidadDias > 0) "${b.cantidadDias} días" else "—"
        cardBarril.visibility  = View.VISIBLE
        tvInstruccion.visibility = View.GONE
        btnConfirmar.isEnabled   = true
    }

    private fun confirmarDevolucion() {
        val barril = barrilActual ?: return
        AlertDialog.Builder(this)
            .setTitle("Confirmar recepción")
            .setMessage("¿Confirmar recepción del barril ${barril.nombreBarril}?")
            .setPositiveButton("Confirmar") { _, _ -> doDevolver(barril) }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun doDevolver(barril: BarrilResponse) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.doDevolver(session.getUserId(), barril.idBarril)
                if (resp.resultado == 1) {
                    Toast.makeText(this@RecibirActivity, "✅ Barril recibido correctamente", Toast.LENGTH_LONG).show()
                    finish()
                } else {
                    Toast.makeText(this@RecibirActivity, resp.mensaje.ifEmpty { resp.error }, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@RecibirActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }
}
