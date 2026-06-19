<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Check, ChevronsUpDown, Search } from 'lucide-vue-next'
import Button from '~/components/ui/button/Button.vue'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'

interface Props {
  modelValue: string
  models: Array<{ id: string; label: string }>
  placeholder?: string
}
const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select or type a model...',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const search = ref('')

function handleSelect(id: string) {
  emit('update:modelValue', id)
  open.value = false
  search.value = ''
}

const filteredModels = computed(() => {
  const term = search.value.toLowerCase().trim()
  if (!term) return props.models
  return props.models.filter(m => m.id.toLowerCase().includes(term))
})

const isExactMatch = computed(() => {
  const term = search.value.trim()
  if (!term) return true
  return props.models.some((m) => m.id === term)
})

function onOpenChange(val: boolean) {
  open.value = val
  if (val) {
    search.value = ''
  }
}
</script>

<template>
  <Popover :open="open" @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-full justify-between font-mono text-sm font-normal text-slate-700"
      >
        <span class="truncate">
          {{ modelValue || placeholder }}
        </span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[var(--radix-popover-trigger-width)] p-0" align="start">
      <div class="flex items-center border-b px-3">
        <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          v-model="search"
          placeholder="Search or type a new model..."
          class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 font-mono"
        />
      </div>
      <div class="max-h-[300px] overflow-y-auto p-1">
        <div v-if="filteredModels.length === 0 && (!search.trim() || isExactMatch)" class="py-6 text-center text-sm text-slate-500">
          No matching models.
        </div>
        
        <div v-if="filteredModels.length > 0" class="mb-1 px-2 py-1.5 text-xs font-semibold text-slate-500">Saved Models</div>
        <button
          v-for="model in filteredModels"
          :key="model.id"
          class="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 hover:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 font-mono"
          @click="handleSelect(model.id)"
        >
          <Check
            class="mr-2 h-4 w-4"
            :class="modelValue === model.id ? 'opacity-100' : 'opacity-0'"
          />
          {{ model.id }}
        </button>
        
        <!-- Provide an option to add whatever the user typed if it's not exactly in the list -->
        <div v-if="search.trim() && !isExactMatch">
          <div v-if="filteredModels.length > 0" class="my-1 h-px bg-slate-100" />
          <button
            class="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm font-medium text-emerald-600 outline-none hover:bg-emerald-50 hover:text-emerald-700 font-mono"
            @click="handleSelect(search.trim())"
          >
            <Check class="mr-2 h-4 w-4 opacity-0" />
            Use "{{ search.trim() }}"
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
