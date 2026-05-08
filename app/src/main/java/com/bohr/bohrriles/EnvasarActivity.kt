package com.bohr.bohrriles

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.*
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bohr.bohrriles.adapters.SelectableAdapter
import com.bohr.bohrriles.models.BarrilResponse
import com.bohr.bohrriles.models.TipoCerveza
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class EnvasarActivity : BaseBarrilActivity() {

    private lateinit var cardBarril: View
    private lateinit var tvNombreBarril: TextView
    private lateinit var tvCodBarril: TextView
    private lateinit var tvEstadoBarril: TextView
    private lateinit var etBuscar: EditText
    private lateinit var rvEstilos: RecyclerView
    private lateinit var btnEscanear: Button
    private lateinit var btnConfirmar: Button
    private lateinit var progressBar: ProgressBar

    private var barrilActual: BarrilResponse? = null
    private var estiloSeleccionado: TipoCerveza? = null
    private var allEstilos: List<TipoCerveza> = emptyList()
    private lateinit var adapter: SelectableAdapter<TipoCerveza>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_envasar)
        session = SessionManager(this)

        cardBarril      = findViewById(R.id.cardBarril)
        tvNombreBarril  = findViewById(R.id.tvNombreBarril)
        tvCodBarril     = findViewById(R.id.tvCodBarril)
        tvEstadoBarril  = findViewById(R.id.tvEstadoBarril)
        etBuscar        = findViewById(R.id.etBuscar)
        rvEstilos       = findViewById(R.id.rvEstilos)
        btnEscanear     = findViewById(R.id.btnEscanear)
        btnConfirmar    = findViewById(R.id.btnConfirmar)
        progressBar     = findViewById(R.id.progressBar)

        adapter = SelectableAdapter(
            getLabel = { it.nombreTipoCerveza },
            onSelected = { estilo ->
                estiloSeleccionado = estilo
                updateConfirmButton()
            }
        )
        rvEstilos.layoutManager = LinearLayoutManager(this)
        rvEstilos.adapter = adapter

        etBuscar.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { filterEstilos(s.toString()) }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        btnEscanear.setOnClickListener { launchScanner() }
        btnConfirmar.setOnClickListener { doEnvasar() }

        loadEstilos()
    }

    private fun loadEstilos() {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.getTipoCervezas()
                allEstilos = resp.tipocervezas
                adapter.setItems(allEstilos)
            } catch (e: Exception) {
                Toast.makeText(this@EnvasarActivity, "Error cargando estilos: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun filterEstilos(query: String) {
        val filtered = if (query.isEmpty()) allEstilos
        else allEstilos.filter { it.nombreTipoCerveza.contains(query, ignoreCase = true) }
        adapter.setItems(filtered)
    }

    override fun onScanResult(code: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.scanEnvasar(code)
                if (resp.error.isNotEmpty()) {
                    Toast.makeText(this@EnvasarActivity, resp.error, Toast.LENGTH_LONG).show()
                } else {
                    barrilActual = resp
                    showBarrilCard(resp)
                }
            } catch (e: Exception) {
                Toast.makeText(this@EnvasarActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun showBarrilCard(barril: BarrilResponse) {
        tvNombreBarril.text  = barril.nombreBarril
        tvCodBarril.text     = "Código: ${barril.codBarril}"
        tvEstadoBarril.text  = "Estado: ${barril.estado}"
        cardBarril.visibility = View.VISIBLE
        updateConfirmButton()
    }

    private fun updateConfirmButton() {
        btnConfirmar.isEnabled = barrilActual != null && estiloSeleccionado != null
    }

    private fun doEnvasar() {
        val barril = barrilActual ?: return
        val estilo = estiloSeleccionado ?: return
        val fecha  = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date())

        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.doEnvasar(
                    session.getUserId(), estilo.idTipoCerveza, barril.idBarril, fecha
                )
                if (resp.resultado == 1) {
                    Toast.makeText(this@EnvasarActivity, "✅ Barril envasado correctamente", Toast.LENGTH_LONG).show()
                    finish()
                } else {
                    Toast.makeText(this@EnvasarActivity, resp.mensaje.ifEmpty { resp.error }, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@EnvasarActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }
}
