package com.bohr.bohrriles

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bohr.bohrriles.adapters.HistorialAdapter
import kotlinx.coroutines.launch

class ConsultarActivity : BaseBarrilActivity() {

    private lateinit var cardBarril: View
    private lateinit var tvNombreBarril: TextView
    private lateinit var tvEstadoBadge: TextView
    private lateinit var tvCodBarril: TextView
    private lateinit var rvHistorial: RecyclerView
    private lateinit var tvInstruccion: TextView
    private lateinit var btnEscanear: Button
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_consultar)
        session = SessionManager(this)

        cardBarril     = findViewById(R.id.cardBarril)
        tvNombreBarril = findViewById(R.id.tvNombreBarril)
        tvEstadoBadge  = findViewById(R.id.tvEstadoBadge)
        tvCodBarril    = findViewById(R.id.tvCodBarril)
        rvHistorial    = findViewById(R.id.rvHistorial)
        tvInstruccion  = findViewById(R.id.tvInstruccion)
        btnEscanear    = findViewById(R.id.btnEscanear)
        progressBar    = findViewById(R.id.progressBar)

        rvHistorial.layoutManager = LinearLayoutManager(this)

        btnEscanear.setOnClickListener { launchScanner() }
    }

    override fun onScanResult(code: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val barrilResp = ApiService.scanConsultar(code)
                if (barrilResp.error.isNotEmpty()) {
                    Toast.makeText(this@ConsultarActivity, barrilResp.error, Toast.LENGTH_LONG).show()
                    setLoading(false)
                    return@launch
                }

                val historialResp = ApiService.getHistorial(barrilResp.idBarril)

                tvNombreBarril.text = barrilResp.nombreBarril
                tvCodBarril.text    = "Código: ${barrilResp.codBarril}"
                tvEstadoBadge.text  = barrilResp.estado.uppercase()
                tvEstadoBadge.setBackgroundColor(estadoColor(barrilResp.estado))

                rvHistorial.adapter = HistorialAdapter(historialResp.historial)

                cardBarril.visibility    = View.VISIBLE
                tvInstruccion.visibility = View.GONE
            } catch (e: Exception) {
                Toast.makeText(this@ConsultarActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun estadoColor(estado: String): Int = when (estado.lowercase()) {
        "disponible"  -> Color.parseColor("#1A7A45")
        "envasado"    -> Color.parseColor("#FF671B")
        "entregado"   -> Color.parseColor("#005C5D")
        "vacio"       -> Color.parseColor("#8A8580")
        else          -> Color.parseColor("#555555")
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }
}
