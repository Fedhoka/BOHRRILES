package com.bohr.bohrriles

import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bohr.bohrriles.adapters.ListRowAdapter
import com.bohr.bohrriles.models.Cliente
import kotlinx.coroutines.launch

class ClientesActivity : AppCompatActivity() {

    private lateinit var etNombre: EditText
    private lateinit var etTelefono: EditText
    private lateinit var btnAgregar: Button
    private lateinit var rvClientes: RecyclerView
    private lateinit var progressBar: ProgressBar

    private lateinit var adapter: ListRowAdapter<Cliente>
    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_clientes)
        session     = SessionManager(this)
        etNombre    = findViewById(R.id.etNombre)
        etTelefono  = findViewById(R.id.etTelefono)
        btnAgregar  = findViewById(R.id.btnAgregar)
        rvClientes  = findViewById(R.id.rvClientes)
        progressBar = findViewById(R.id.progressBar)

        adapter = ListRowAdapter(
            getName   = { it.nombre },
            getDetail = { if (it.telefono.isNotEmpty()) "📞 ${it.telefono}" else "" },
            onDelete  = { confirmarEliminar(it) }
        )
        rvClientes.layoutManager = LinearLayoutManager(this)
        rvClientes.adapter = adapter

        btnAgregar.setOnClickListener { agregarCliente() }
        loadClientes()
    }

    private fun loadClientes() {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.getClientes()
                adapter.setItems(resp.clientes)
            } catch (e: Exception) {
                Toast.makeText(this@ClientesActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun agregarCliente() {
        val nombre   = etNombre.text.toString().trim()
        val telefono = etTelefono.text.toString().trim()
        if (nombre.isEmpty()) {
            etNombre.error = "Ingresá un nombre"
            return
        }
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.crearCliente(nombre, telefono)
                if (resp.resultado == 1) {
                    etNombre.setText("")
                    etTelefono.setText("")
                    Toast.makeText(this@ClientesActivity, "✅ Cliente agregado", Toast.LENGTH_SHORT).show()
                    loadClientes()
                } else {
                    Toast.makeText(this@ClientesActivity, resp.mensaje.ifEmpty { resp.error }, Toast.LENGTH_LONG).show()
                    setLoading(false)
                }
            } catch (e: Exception) {
                Toast.makeText(this@ClientesActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                setLoading(false)
            }
        }
    }

    private fun confirmarEliminar(cliente: Cliente) {
        AlertDialog.Builder(this)
            .setTitle("Eliminar cliente")
            .setMessage("¿Eliminar a ${cliente.nombre}?")
            .setPositiveButton("Eliminar") { _, _ -> eliminarCliente(cliente) }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun eliminarCliente(cliente: Cliente) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.deleteCliente(cliente.id)
                if (resp.resultado == 1) {
                    Toast.makeText(this@ClientesActivity, "Cliente eliminado", Toast.LENGTH_SHORT).show()
                    loadClientes()
                } else {
                    Toast.makeText(this@ClientesActivity, resp.mensaje.ifEmpty { resp.error }, Toast.LENGTH_LONG).show()
                    setLoading(false)
                }
            } catch (e: Exception) {
                Toast.makeText(this@ClientesActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }
}
