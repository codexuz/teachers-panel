<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const prompt = ref(props.modelValue.prompt || '')
const correctAnswer = ref(props.modelValue.correctAnswer || '')
const caseSensitive = ref(props.modelValue.caseSensitive || false)

watch([prompt, correctAnswer, caseSensitive], () => {
  emit('update:modelValue', {
    ...props.modelValue,
    type: 'typing',
    prompt: prompt.value,
    correctAnswer: correctAnswer.value,
    caseSensitive: caseSensitive.value
  })
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
      <input v-model="prompt" type="text"
             class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             placeholder="Enter the question or prompt" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
      <input v-model="correctAnswer" type="text"
             class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             placeholder="Enter the correct answer" />
    </div>

    <div class="flex items-center gap-2">
      <input type="checkbox" v-model="caseSensitive" id="case-sensitive"
             class="w-4 h-4 text-blue-600 rounded" />
      <label for="case-sensitive" class="text-sm text-gray-700">Case sensitive</label>
    </div>
  </div>
</template>