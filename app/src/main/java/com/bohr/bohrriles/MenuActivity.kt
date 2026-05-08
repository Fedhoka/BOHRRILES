package com.bohr.bohrriles

import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class MenuActivity : AppCompatActivity() {

    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_menu)

        session = SessionManager(this)

        // Greeting
        findViewById<TextView>(R.id.tvGreeting).text = "Hola, ${session.getNombre()}"

        // Navigation
        findViewById<LinearLayout>(R.id.btnEnvasar).setOnClickListener {
            startActivity(Intent(this, EnvasarActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.btnEntregar).setOnClickListener {
            startActivity(Intent(this, EntregarActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.btnRecibir).setOnClickListener {
            startActivity(Intent(this, RecibirActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.btnVaciar).setOnClickListener {
            startActivity(Intent(this, VaciarActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.btnConsultar).setOnClickListener {
            startActivity(Intent(this, ConsultarActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.btnClientes).setOnClickListener {
            startActivity(Intent(this, ClientesActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.btnEstilos).setOnClickListener {
            startActivity(Intent(this, EstilosActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.btnLogout).setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Cerrar sesión")
                .setMessage("¿Querés cerrar la sesión?")
                .setPositiveButton("Sí") { _, _ ->
                    session.logout()
                    startActivity(Intent(this, LoginActivity::class.java))
                    finish()
                }
                .setNegativeButton("Cancelar", null)
                .show()
        }
    }
}
