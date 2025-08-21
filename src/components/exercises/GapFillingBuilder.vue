<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const text = ref(props.modelValue.text || '')
const gaps = ref(props.modelValue.gaps || [])

const addGap = () => {
  const selection = window.getSelection()
  const start = selection.anchorOffset
  const end = selection.focusOffset

  if (start === end) return

  const selectedText = text.value.substring(start, end)
  gaps.value.push({
    id: gaps.value.length + 1,
    answer: selectedText,
    start,
    end
  });

  console.log(gaps.value, selectedText)
}

watch([text, gaps], () => {
  emit('update:modelValue', {
    ...props.modelValue,
    type: 'gap-filling',
    text: text.value,
    gaps: gaps.value
  })
}, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Text</label>
      <div class="relative">
        <textarea v-model="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          placeholder="Enter your text. Select words to create gaps."></textarea>
        <button @click="addGap"
          class="absolute top-2 right-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <span class="material-icons">format_strikethrough</span>
        </button>
      </div>
    </div>

    <div v-if="gaps.length > 0">
      <label class="block text-sm font-medium text-gray-700 mb-2">Gaps</label>
      <div class="space-y-2">
        <div v-for="gap in gaps" :key="gap.id" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-600">Answer:</span>
          <span class="font-medium">{{ gap.answer }}</span>
          <button @click="gaps = gaps.filter(g => g.id !== gap.id)"
            class="ml-auto p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
