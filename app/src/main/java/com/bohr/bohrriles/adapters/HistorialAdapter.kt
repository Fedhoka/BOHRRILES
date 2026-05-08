package com.bohr.bohrriles.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bohr.bohrriles.R
import com.bohr.bohrriles.models.HistorialItem

class HistorialAdapter(private val items: List<HistorialItem>) :
    RecyclerView.Adapter<HistorialAdapter.VH>() {

    inner class VH(v: View) : RecyclerView.ViewHolder(v) {
        val tvAccion:  TextView = v.findViewById(R.id.tvAccion)
        val tvDetalle: TextView = v.findViewById(R.id.tvDetalle)
        val tvFecha:   TextView = v.findViewById(R.id.tvFecha)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_historial, parent, false)
        return VH(v)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        holder.tvAccion.text  = item.accion
        val details = buildString {
            item.estilo?.let { append(it) }
            item.cliente?.let { if (isNotEmpty()) append(" · "); append(it) }
        }
        holder.tvDetalle.text = details
        holder.tvDetalle.visibility = if (details.isEmpty()) View.GONE else View.VISIBLE
        holder.tvFecha.text = item.fecha
    }
}
