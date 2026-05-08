package com.bohr.bohrriles.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bohr.bohrriles.R

class ListRowAdapter<T>(
    private val getName: (T) -> String,
    private val getDetail: (T) -> String = { "" },
    private val onDelete: (T) -> Unit
) : RecyclerView.Adapter<ListRowAdapter<T>.VH>() {

    private var items: List<T> = emptyList()

    fun setItems(newItems: List<T>) {
        items = newItems
        notifyDataSetChanged()
    }

    inner class VH(v: View) : RecyclerView.ViewHolder(v) {
        val tvNombre:   TextView = v.findViewById(R.id.tvNombre)
        val tvDetalle:  TextView = v.findViewById(R.id.tvDetalle)
        val btnEliminar: TextView = v.findViewById(R.id.btnEliminar)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_list_row, parent, false)
        return VH(v)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        holder.tvNombre.text  = getName(item)
        val detail = getDetail(item)
        holder.tvDetalle.text       = detail
        holder.tvDetalle.visibility = if (detail.isEmpty()) View.GONE else View.VISIBLE
        holder.btnEliminar.setOnClickListener { onDelete(item) }
    }
}
