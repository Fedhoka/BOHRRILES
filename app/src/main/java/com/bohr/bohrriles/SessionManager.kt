package com.bohr.bohrriles

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("bohr_session", Context.MODE_PRIVATE)

    fun saveSession(idUsuario: Int, nombre: String, apellido: String, permiso: String, token: String) {
        prefs.edit().apply {
            putInt(KEY_USER_ID, idUsuario)
            putString(KEY_NAME, nombre)
            putString(KEY_APELLIDO, apellido)
            putString(KEY_PERMISO, permiso)
            putString(KEY_TOKEN, token)
            putBoolean(KEY_LOGGED_IN, true)
            apply()
        }
    }

    fun isLoggedIn() = prefs.getBoolean(KEY_LOGGED_IN, false)
    fun getUserId() = prefs.getInt(KEY_USER_ID, 0)
    fun getNombre() = prefs.getString(KEY_NAME, "") ?: ""
    fun getApellido() = prefs.getString(KEY_APELLIDO, "") ?: ""
    fun getToken() = prefs.getString(KEY_TOKEN, "") ?: ""

    fun logout() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_USER_ID = "idUsuario"
        private const val KEY_NAME = "nombre"
        private const val KEY_APELLIDO = "apellido"
        private const val KEY_PERMISO = "permiso"
        private const val KEY_TOKEN = "token"
        private const val KEY_LOGGED_IN = "loggedIn"
    }
}
