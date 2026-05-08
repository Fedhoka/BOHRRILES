package com.bohr.bohrriles

import com.bohr.bohrriles.models.*
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

object ApiService {

    private const val BASE_URL = "http://192.168.0.5/bohrriles/app.php?"

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    private suspend fun get(params: String): String = withContext(Dispatchers.IO) {
        val url = BASE_URL + params
        val request = Request.Builder().url(url).build()
        client.newCall(request).execute().use { response ->
            response.body?.string() ?: throw Exception("Respuesta vacía del servidor")
        }
    }

    private fun encode(s: String) = URLEncoder.encode(s, "UTF-8")

    // ─── Auth ───────────────────────────────────────────────────────────────

    suspend fun login(login: String, password: String): LoginResponse {
        val json = get("accion=login&login=${encode(login)}&password=${encode(password)}")
        return gson.fromJson(json, LoginResponse::class.java)
    }

    // ─── Scan ───────────────────────────────────────────────────────────────

    suspend fun scanEnvasar(codBarril: String): BarrilResponse {
        val json = get("accion=scan_barril_envasar&codBarril=${encode(codBarril)}")
        return gson.fromJson(json, BarrilResponse::class.java)
    }

    suspend fun scanEntregar(codBarril: String): BarrilResponse {
        val json = get("accion=scan_barril_entregar&codBarril=${encode(codBarril)}")
        return gson.fromJson(json, BarrilResponse::class.java)
    }

    suspend fun scanDevolver(codBarril: String): BarrilResponse {
        val json = get("accion=scan_barril_devolver&codBarril=${encode(codBarril)}")
        return gson.fromJson(json, BarrilResponse::class.java)
    }

    suspend fun scanVaciar(codBarril: String): BarrilResponse {
        val json = get("accion=scan_barril_vaciar&codBarril=${encode(codBarril)}")
        return gson.fromJson(json, BarrilResponse::class.java)
    }

    suspend fun scanConsultar(codBarril: String): BarrilResponse {
        val json = get("accion=scan_barril&codBarril=${encode(codBarril)}")
        return gson.fromJson(json, BarrilResponse::class.java)
    }

    // ─── Operations ─────────────────────────────────────────────────────────

    suspend fun doEnvasar(idUsuario: Int, idTipoCerveza: Int, idBarril: Int, fechaEnvasado: String): GenericResponse {
        val json = get("accion=doEnvasar&idUsuario=$idUsuario&idTipoCerveza=$idTipoCerveza&idBarril=$idBarril&fechaEnvasado=${encode(fechaEnvasado)}")
        return gson.fromJson(json, GenericResponse::class.java)
    }

    suspend fun doEntregar(idUsuario: Int, idBarril: Int, idEnvasado: Int, idCliente: Int): GenericResponse {
        val json = get("accion=doEntregar&idUsuario=$idUsuario&idBarril=$idBarril&idEnvasado=$idEnvasado&idCliente=$idCliente")
        return gson.fromJson(json, GenericResponse::class.java)
    }

    suspend fun doDevolver(idUsuario: Int, idBarril: Int): GenericResponse {
        val json = get("accion=doDevolver&idUsuario=$idUsuario&idBarril=$idBarril")
        return gson.fromJson(json, GenericResponse::class.java)
    }

    suspend fun doVaciar(idUsuario: Int, idBarril: Int): GenericResponse {
        val json = get("accion=doVaciar&idUsuario=$idUsuario&idBarril=$idBarril")
        return gson.fromJson(json, GenericResponse::class.java)
    }

    // ─── Lists ──────────────────────────────────────────────────────────────

    suspend fun getClientes(): ClientesResponse {
        val json = get("accion=get_clientes")
        return gson.fromJson(json, ClientesResponse::class.java)
    }

    suspend fun getTipoCervezas(): TipoCervezasResponse {
        val json = get("accion=get_lista_tipocervezas")
        return gson.fromJson(json, TipoCervezasResponse::class.java)
    }

    suspend fun getHistorial(idBarril: Int): HistorialResponse {
        val json = get("accion=get_historial_barril&idBarril=$idBarril")
        return gson.fromJson(json, HistorialResponse::class.java)
    }

    // ─── Management ─────────────────────────────────────────────────────────

    suspend fun crearCliente(nombre: String, telefono: String): GenericResponse {
        val json = get("accion=crear_cliente&nombre=${encode(nombre)}&telefono=${encode(telefono)}")
        return gson.fromJson(json, GenericResponse::class.java)
    }

    suspend fun deleteCliente(idCliente: Int): GenericResponse {
        val json = get("accion=delete_cliente&idCliente=$idCliente")
        return gson.fromJson(json, GenericResponse::class.java)
    }

    suspend fun crearEstilo(nombre: String, descripcion: String): GenericResponse {
        val json = get("accion=crear_estilo&nombre=${encode(nombre)}&descripcion=${encode(descripcion)}")
        return gson.fromJson(json, GenericResponse::class.java)
    }

    suspend fun deleteEstilo(idEstilo: Int): GenericResponse {
        val json = get("accion=delete_estilo&idEstilo=$idEstilo")
        return gson.fromJson(json, GenericResponse::class.java)
    }
}
