package com.bohr.bohrriles.models

data class LoginResponse(
    val resultado: Int = 0,
    val idUsuario: Int = 0,
    val nombre: String = "",
    val apellido: String = "",
    val permiso: String = "",
    val token: String = "",
    val mensaje: String = ""
)

data class BarrilResponse(
    val resultado: Int = 1,
    val idBarril: Int = 0,
    val nombreBarril: String = "",
    val codBarril: String = "",
    val estado: String = "",
    // entregar extra
    val idEnvasado: Int = 0,
    val nombreTipoCerveza: String = "",
    // devolver extra
    val nombreComercio: String = "",
    val fechaEntrega: String = "",
    val cantidadDias: Int = 0,
    val mensaje: String = "",
    val error: String = ""
)

data class Cliente(
    val id: Int = 0,
    val nombre: String = "",
    val telefono: String = ""
)

data class ClientesResponse(
    val resultado: Int = 1,
    val clientes: List<Cliente> = emptyList()
)

data class TipoCerveza(
    val idTipoCerveza: Int = 0,
    val nombreTipoCerveza: String = ""
)

data class TipoCervezasResponse(
    val resultado: Int = 1,
    val tipocervezas: List<TipoCerveza> = emptyList()
)

data class HistorialItem(
    val fecha: String = "",
    val accion: String = "",
    val estilo: String? = null,
    val cliente: String? = null
)

data class HistorialResponse(
    val resultado: Int = 1,
    val historial: List<HistorialItem> = emptyList()
)

data class GenericResponse(
    val resultado: Int = 0,
    val mensaje: String = "",
    val error: String = ""
)
