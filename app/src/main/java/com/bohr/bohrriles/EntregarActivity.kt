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
import com.bohr.bohrriles.models.Cliente
import kotlinx.coroutines.launch

class EntregarActivity : BaseBarrilActivity() {

    private lateinit var cardBarril: View
    private lateinit var tvNombreBarril: TextView
    private lateinit var tvCerveza: TextView
    private lateinit var etBuscar: EditText
    private lateinit var rvClientes: RecyclerView
    private lateinit var btnEscanear: Button
    private lateinit var btnConfirmar: Button
    private lateinit var progressBar: ProgressBar

    private var barrilActual: BarrilResponse? = null
    private var clienteSeleccionado: Cliente? = null
    private var allClientes: List<Cliente> = emptyList()
    private lateinit var adapter: SelectableAdapter<Cliente>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_entregar)
        session = SessionManager(this)

        cardBarril     = findViewById(R.id.cardBarril)
        tvNombreBarril = findViewById(R.id.tvNombreBarril)
        tvCerveza      = findViewById(R.id.tvCerveza)
        etBuscar       = findViewById(R.id.etBuscar)
        rvClientes     = findViewById(R.id.rvClientes)
        btnEscanear    = findViewById(R.id.btnEscanear)
        btnConfirmar   = findViewById(R.id.btnConfirmar)
        progressBar    = findViewById(R.id.progressBar)

        adapter = SelectableAdapter(
            getLabel = { it.nombre },
            onSelected = { cliente ->
                clienteSeleccionado = cliente
                updateConfirmButton()
            }
        )
        rvClientes.layoutManager = LinearLayoutManager(this)
        rvClientes.adapter = adapter

        etBuscar.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { filterClientes(s.toString()) }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        btnEscanear.setOnClickListener { launchScanner() }
        btnConfirmar.setOnClickListener { doEntregar() }

        loadClientes()
    }

    private fun loadClientes() {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.getClientes()
                allClientes = resp.clientes
                adapter.setItems(allClientes)
            } catch (e: Exception) {
                Toast.makeText(this@EntregarActivity, "Error cargando clientes: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun filterClientes(query: String) {
        val filtered = if (query.isEmpty()) allClientes
        else allClientes.filter { it.nombre.contains(query, ignoreCase = true) }
        adapter.setItems(filtered)
    }

    override fun onScanResult(code: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.scanEntregar(code)
                if (resp.error.isNotEmpty()) {
                    Toast.makeText(this@EntregarActivity, resp.error, Toast.LENGTH_LONG).show()
                } else {
                    barrilActual = resp
                    tvNombreBarril.text = resp.nombreBarril
                    tvCerveza.text = "Cerveza: ${resp.nombreTipoCerveza} | Envasado #${resp.idEnvasado}"
                    cardBarril.visibility = View.VISIBLE
                    updateConfirmButton()
                }
            } catch (e: Exception) {
                Toast.makeText(this@EntregarActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun updateConfirmButton() {
        btnConfirmar.isEnabled = barrilActual != null && clienteSeleccionado != null
    }

    private fun doEntregar() {
        val barril  = barrilActual ?: return
        val cliente = clienteSeleccionado ?: return

        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.doEntregar(
                    session.getUserId(), barril.idBarril, barril.idEnvasado, cliente.id
                )
                if (resp.resultado == 1) {
                    Toast.makeText(this@EntregarActivity, "✅ Barril entregado a ${cliente.nombre}", Toast.LENGTH_LONG).show()
                    finish()
                } else {
                    Toast.makeText(this@EntregarActivity, resp.mensaje.ifEmpty { resp.error }, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@EntregarActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }
}
