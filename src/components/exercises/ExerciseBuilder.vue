<script setup>
import { ref } from 'vue'
import MultipleChoiceBuilder from './MultipleChoiceBuilder.vue'
import GapFillingBuilder from './GapFillingBuilder.vue'
import TypingBuilder from './TypingBuilder.vue'
import PronunciationBuilder from './PronunciationBuilder.vue'
import MatchingBuilder from './MatchingBuilder.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const exerciseTypes = [
  { id: 'multiple-choice', name: 'Multiple Choice', icon: 'radio_button_checked' },
  { id: 'gap-filling', name: 'Gap Filling', icon: 'format_strikethrough' },
  { id: 'typing', name: 'Typing', icon: 'keyboard' },
  { id: 'matching', name: 'Matching', icon: 'compare_arrows' },
  { id: 'pronunciation', name: 'Pronunciation', icon: 'record_voice_over' },
]

const selectedType = ref(props.modelValue.type || exerciseTypes[0].id)

const updateExercise = (data) => {
  emit('update:modelValue', { ...props.modelValue, ...data })
}
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden w-full">
    <!-- Exercise Type Selector -->
    <div class="p-4 border-b border-gray-200">
      <label class="block text-sm font-medium text-gray-700 mb-2">Exercise Type</label>
      <div class="flex gap-3">
        <button v-for="type in exerciseTypes" :key="type.id" @click="selectedType = type.id" :class="[
          'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
          selectedType === type.id
            ? 'bg-blue-50 text-blue-600 border-blue-200'
            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
        ]" class="border">
          <span class="material-icons">{{ type.icon }}</span>
          <span>{{ type.name }}</span>
        </button>
      </div>
    </div>

    <!-- Exercise Builder Components -->
    <div class="p-4">
      <component :is="selectedType === 'multiple-choice' ? MultipleChoiceBuilder
        : selectedType === 'gap-filling' ? GapFillingBuilder
          : selectedType === 'typing' ? TypingBuilder
            : selectedType === 'pronunciation' ? PronunciationBuilder
              : MatchingBuilder" :modelValue="modelValue" @update:modelValue="updateExercise" />
    </div>
  </div>
</template>
