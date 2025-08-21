<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const question = ref(props.modelValue.question || '')
const options = ref(props.modelValue.options || [
  { id: 1, text: '', isCorrect: false },
  { id: 2, text: '', isCorrect: false },
  { id: 3, text: '', isCorrect: false },
])

const addOption = () => {
  options.value.push({
    id: options.value.length + 1,
    text: '',
    isCorrect: false
  })
}

const removeOption = (index) => {
  options.value.splice(index, 1)
}

watch([question, options], () => {
  emit('update:modelValue', {
    ...props.modelValue,
    type: 'multiple-choice',
    question: question.value,
    options: options.value
  })
}, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Question</label>
      <input v-model="question" type="text"
             class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
             placeholder="Enter your question" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Options</label>
      <div class="space-y-2">
        <div v-for="(option, index) in options" :key="option.id"
             class="flex items-center gap-3">
          <input type="radio"
                 :name="'correct-answer'"
                 :checked="option.isCorrect"
                 @change="() => {
                   options.forEach(opt => opt.isCorrect = false)
                   option.isCorrect = true
                 }"
                 class="w-4 h-4 text-blue-600" />
          <input v-model="option.text" type="text"
                 class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                 :placeholder="`Option ${index + 1}`" />
          <button @click="removeOption(index)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  :disabled="options.length <= 2">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
      <button @click="addOption"
              class="mt-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
        Add Option
      </button>
    </div>
  </div>
</template>
