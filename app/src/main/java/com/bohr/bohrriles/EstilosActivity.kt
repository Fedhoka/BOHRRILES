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
import com.bohr.bohrriles.models.TipoCerveza
import kotlinx.coroutines.launch

class EstilosActivity : AppCompatActivity() {

    private lateinit var etNombre: EditText
    private lateinit var etDescripcion: EditText
    private lateinit var btnAgregar: Button
    private lateinit var rvEstilos: RecyclerView
    private lateinit var progressBar: ProgressBar

    private lateinit var adapter: ListRowAdapter<TipoCerveza>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_estilos)

        etNombre      = findViewById(R.id.etNombre)
        etDescripcion = findViewById(R.id.etDescripcion)
        btnAgregar    = findViewById(R.id.btnAgregar)
        rvEstilos     = findViewById(R.id.rvEstilos)
        progressBar   = findViewById(R.id.progressBar)

        adapter = ListRowAdapter(
            getName  = { it.nombreTipoCerveza },
            onDelete = { confirmarEliminar(it) }
        )
        rvEstilos.layoutManager = LinearLayoutManager(this)
        rvEstilos.adapter = adapter

        btnAgregar.setOnClickListener { agregarEstilo() }
        loadEstilos()
    }

    private fun loadEstilos() {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.getTipoCervezas()
                adapter.setItems(resp.tipocervezas)
            } catch (e: Exception) {
                Toast.makeText(this@EstilosActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun agregarEstilo() {
        val nombre      = etNombre.text.toString().trim()
        val descripcion = etDescripcion.text.toString().trim()
        if (nombre.isEmpty()) {
            etNombre.error = "Ingresá un nombre"
            return
        }
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.crearEstilo(nombre, descripcion)
                if (resp.resultado == 1) {
                    etNombre.setText("")
                    etDescripcion.setText("")
                    Toast.makeText(this@EstilosActivity, "✅ Estilo agregado", Toast.LENGTH_SHORT).show()
                    loadEstilos()
                } else {
                    Toast.makeText(this@EstilosActivity, resp.mensaje.ifEmpty { resp.error }, Toast.LENGTH_LONG).show()
                    setLoading(false)
                }
            } catch (e: Exception) {
                Toast.makeText(this@EstilosActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                setLoading(false)
            }
        }
    }

    private fun confirmarEliminar(estilo: TipoCerveza) {
        AlertDialog.Builder(this)
            .setTitle("Eliminar estilo")
            .setMessage("¿Eliminar ${estilo.nombreTipoCerveza}?")
            .setPositiveButton("Eliminar") { _, _ -> eliminarEstilo(estilo) }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun eliminarEstilo(estilo: TipoCerveza) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val resp = ApiService.deleteEstilo(estilo.idTipoCerveza)
                if (resp.resultado == 1) {
                    Toast.makeText(this@EstilosActivity, "Estilo eliminado", Toast.LENGTH_SHORT).show()
                    loadEstilos()
                } else {
                    Toast.makeText(this@EstilosActivity, resp.mensaje.ifEmpty { resp.error }, Toast.LENGTH_LONG).show()
                    setLoading(false)
                }
            } catch (e: Exception) {
                Toast.makeText(this@EstilosActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }
}
