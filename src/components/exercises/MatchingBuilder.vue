<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const pairs = ref(props.modelValue.pairs || [
  { id: 1, left: '', right: '' },
  { id: 2, left: '', right: '' }
])

const addPair = () => {
  pairs.value.push({
    id: pairs.value.length + 1,
    left: '',
    right: ''
  })
}

const removePair = (index) => {
  pairs.value.splice(index, 1)
}

watch(pairs, () => {
  emit('update:modelValue', {
    ...props.modelValue,
    type: 'matching',
    pairs: pairs.value
  })
}, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <div v-for="(pair, index) in pairs" :key="pair.id"
         class="flex items-center gap-3">
      <input v-model="pair.left" type="text"
             class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             placeholder="Left item" />

      <span class="material-icons text-gray-400">arrow_forward</span>

      <input v-model="pair.right" type="text"
             class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             placeholder="Right item" />

      <button @click="removePair(index)"
              class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              :disabled="pairs.length <= 2">
        <span class="material-icons">delete</span>
      </button>
    </div>

    <button @click="addPair"
            class="w-full px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
      Add Matching Pair
    </button>
  </div>
</template>
