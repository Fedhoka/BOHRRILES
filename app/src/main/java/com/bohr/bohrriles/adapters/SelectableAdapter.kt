package com.bohr.bohrriles.adapters

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bohr.bohrriles.R

class SelectableAdapter<T>(
    private val getLabel: (T) -> String,
    private val onSelected: (T) -> Unit
) : RecyclerView.Adapter<SelectableAdapter<T>.VH>() {

    private var items: List<T> = emptyList()
    private var selectedPos: Int = -1

    fun setItems(newItems: List<T>) {
        items = newItems
        selectedPos = -1
        notifyDataSetChanged()
    }

    inner class VH(v: View) : RecyclerView.ViewHolder(v) {
        val tvName:  TextView = v.findViewById(R.id.tvItemName)
        val tvCheck: TextView = v.findViewById(R.id.tvCheck)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_selectable, parent, false)
        return VH(v)
    }

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        holder.tvName.text  = getLabel(item)
        val selected = position == selectedPos
        holder.tvCheck.text      = if (selected) "●" else "○"
        holder.tvCheck.setTextColor(if (selected) Color.parseColor("#FF671B") else Color.parseColor("#CCCCCC"))
        holder.itemView.setBackgroundResource(R.drawable.bg_card)
        holder.itemView.setOnClickListener {
            val prev = selectedPos
            selectedPos = holder.adapterPosition
            notifyItemChanged(prev)
            notifyItemChanged(selectedPos)
            onSelected(item)
        }
    }
}
