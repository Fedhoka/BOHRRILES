package com.bohr.bohrriles

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var etUsuario: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnIngresar: Button
    private lateinit var tvError: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        session = SessionManager(this)
        if (session.isLoggedIn()) {
            goToMenu()
            return
        }

        setContentView(R.layout.activity_login)
        etUsuario   = findViewById(R.id.etUsuario)
        etPassword  = findViewById(R.id.etPassword)
        btnIngresar = findViewById(R.id.btnIngresar)
        tvError     = findViewById(R.id.tvError)
        progressBar = findViewById(R.id.progressBar)

        btnIngresar.setOnClickListener { doLogin() }
    }

    private fun doLogin() {
        val usuario  = etUsuario.text.toString().trim()
        val password = etPassword.text.toString().trim()

        if (usuario.isEmpty() || password.isEmpty()) {
            showError("Completá usuario y contraseña")
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            try {
                val resp = ApiService.login(usuario, password)
                if (resp.resultado == 1) {
                    session.saveSession(
                        resp.idUsuario, resp.nombre, resp.apellido,
                        resp.permiso, resp.token
                    )
                    goToMenu()
                } else {
                    showError(resp.mensaje.ifEmpty { "Usuario o contraseña incorrectos" })
                }
            } catch (e: Exception) {
                showError("Error de conexión: ${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun goToMenu() {
        startActivity(Intent(this, MenuActivity::class.java))
        finish()
    }

    private fun showError(msg: String) {
        tvError.text = msg
        tvError.visibility = View.VISIBLE
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnIngresar.isEnabled  = !loading
    }
}
