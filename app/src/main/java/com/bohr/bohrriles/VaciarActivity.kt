package com.bohr.bohrriles

import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.bohr.bohrriles.models.BarrilResponse
import kotlinx.coroutines.launch

class VaciarActivity : BaseBarrilActivity() {

    private lateinit var cardBarril: View
    private lateinit var tvNombreBarril: TextView
    private lateinit var tvCodBarril: TextView
    private lateinit var tvEstado: TextView
    private lateinit var tvInstruccion: TextView
    private lateinit var btnEscanear: Button
    private lateinit var btnConfirmar: Button
    private lateinit var progressBar: ProgressBar

    private var barrilActual: BarrilResponse? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_vaciar)
        session = SessionManager(this)

        cardBarril     = findViewById(R.id.cardBarril)
        tvNombreBarril = findViewById(R.id.tvNombreBarril)
        tvCodBarril    = findViewById(R.id.tvCodBarril)
        tvEstado       = findViewById(R.id.tvEstado)
        tvInstruccion  = findViewById(R.id.tvInstruccion)
        btnEscanear    = findViewById(R.id.btnEscanear)
        btnConfirmar   = findViewById(R.id.btnConfirmar)
        progressBar    = findViewById(R.id.progressBar)

        btnEscanear.setOnClickListener { launchScanner() }
        btnConfirmar.setOnClickListener { confirmarVaciado() }
    }

    override fun onScanResult(code: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.scanVaciar(code)
                if (resp.error.isNotEmpty()) {
                    Toast.makeText(this@VaciarActivity, resp.error, Toast.LENGTH_LONG).show()
                } else {
                    barrilActual = resp
                    tvNombreBarril.text    = resp.nombreBarril
                    tvCodBarril.text       = resp.codBarril
                    tvEstado.text          = resp.estado
                    cardBarril.visibility  = View.VISIBLE
                    tvInstruccion.visibility = View.GONE
                    btnConfirmar.isEnabled   = true
                }
            } catch (e: Exception) {
                Toast.makeText(this@VaciarActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun confirmarVaciado() {
        val barril = barrilActual ?: return
        AlertDialog.Builder(this)
            .setTitle("Confirmar vaciado")
            .setMessage("¿Marcar el barril ${barril.nombreBarril} como vacío?")
            .setPositiveButton("Vaciar") { _, _ -> doVaciar(barril) }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun doVaciar(barril: BarrilResponse) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.doVaciar(session.getUserId(), barril.idBarril)
                if (resp.resultado == 1) {
                    Toast.makeText(this@VaciarActivity, "✅ Barril marcado como vacío", Toast.LENGTH_LONG).show()
                    finish()
                } else {
                    Toast.makeText(this@VaciarActivity, resp.mensaje.ifEmpty { resp.error }, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@VaciarActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }
}
