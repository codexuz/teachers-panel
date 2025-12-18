<template>
  <div class="editorjs" ref="htmlelement"></div>
</template>

<script setup>
import EditorJS from "@editorjs/editorjs";
import EmbedTool from "@editorjs/embed";
import ListTool from "@editorjs/list";
import AttachesTool from "@editorjs/attaches";
import AudioPlayer from "editorjs-audio-player";
import { onMounted, onUnmounted, ref, watch } from "vue";

const htmlelement = ref(null);

const props = defineProps({
  modelValue: {
    type: [Object, String],
    default: null,
  },
  placeholder: String,
  readOnly: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

let editor;
let updatingModel = false;

// model -> view
function modelToView() {
  if (!props.modelValue) {
    return;
  }
  if (typeof props.modelValue === "string") {
    editor.blocks.renderFromHTML(props.modelValue);
    return;
  }
  editor.render(props.modelValue);
}

// view -> model
function viewToModel(api, event) {
  if (props.readOnly) {
    return;
  }
  updatingModel = true;
  editor
    .save()
    .then((outputData) => {
      console.log(event, "Saving completed: ", outputData);
      emit("update:modelValue", outputData);
    })
    .catch((error) => {
      console.log(event, "Saving failed: ", error);
    })
    .finally(() => {
      updatingModel = false;
    });
}

onMounted(() => {
  // Build tools object conditionally based on readOnly mode
  const tools = {
    embed: EmbedTool,
    list: ListTool,
  };

  // Only include attaches and audioPlayer in edit mode (not read-only)
  if (!props.readOnly) {
    tools.attaches = {
      class: AttachesTool,
      config: {
        uploader: {
          uploadByFile(file) {
            const formData = new FormData();
            formData.append("file", file);

            return fetch("https://backend.impulselc.uz/api/upload", {
              method: "POST",
              body: formData,
            })
              .then((response) => response.json())
              .then((data) => {
                return {
                  success: 1,
                  file: {
                    url: data.url,
                    name: data.originalName,
                    extension: data.originalName?.split(".").pop(),
                  },
                };
              })
              .catch((error) => {
                console.error("Upload failed:", error);
                return {
                  success: 0,
                };
              });
          },
        },
      },
    };
    tools.audioPlayer = AudioPlayer;
  }

  editor = new EditorJS({
    holder: htmlelement.value,
    placeholder: props.placeholder,
    inlineToolbar: ["bold", "italic", "link"],
    tools: tools,
    readOnly: props.readOnly,
    minHeight: 0,
    data: props.modelValue,
    onReady: modelToView,
    onChange: viewToModel,
  });
});

watch(
  () => props.modelValue,
  () => {
    if (!updatingModel) {
      modelToView();
    }
  }
);

onUnmounted(() => {
  if (editor && typeof editor.destroy === "function") {
    editor.destroy();
  }
});
</script>

<style>
.editorjs {
  min-height: 200px;
}

/* Move the plus icon to the left */
.editorjs :deep(.ce-toolbar__plus) {
  left: 0;
  right: auto;
}

.editorjs :deep(.ce-toolbar__actions) {
  right: auto;
  left: 0;
}

/* Adjust block content to make room for left toolbar */
.editorjs :deep(.ce-block__content) {
  margin-left: 60px;
  margin-right: 0;
}

.editorjs :deep(.codex-editor__redactor) {
  padding-left: 0 !important;
}
</style>
