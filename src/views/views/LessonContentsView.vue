<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import {
  lessonContentAPI,
  lessonsAPI,
  unitsAPI,
  courseAPI,
  uploadAPI,
} from "@/utils/api.js";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Upload,
  X,
  FileText,
  ExternalLink,
} from "lucide-vue-next";

const isLoading = ref(false);
const error = ref("");
const searchQuery = ref("");
const showModal = ref(false);
const isEditMode = ref(false);

// Upload states
const uploadProgress = ref(0);
const isUploading = ref(false);
const isDragOver = ref(false);

// Data
const lessonContents = ref([]);
const lessons = ref([]);
const units = ref([]);
const courses = ref([]);
const selectedCourse = ref("all");
const selectedUnit = ref("all");
const selectedLesson = ref("all");

// Modal-specific selections (separate from main page filters)
const modalSelectedCourse = ref("all");
const modalSelectedUnit = ref("all");

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);
const itemsPerPageOptions = [5, 10, 20, 50];

// Rich editor and media handling
const youtubePreview = ref(false);
const fileInput = ref(null);
const resourceFileInput = ref(null);

// Form data
const form = reactive({
  id: null,
  title: "",
  content: "",
  mediaUrl: "",
  mediaType: "none", // 'url', 'youtube_url', 'embed', 'none'
  mediaFile: null,
  resources: [], // Array of resource URLs
  resourceFiles: [], // Array of files to upload for resources
  order_number: 1,
  lessonId: "",
  isActive: true,
});

// Computed properties
const filteredContents = computed(() => {
  let result = lessonContents.value;

  if (selectedCourse.value && selectedCourse.value !== "all") {
    // Filter by lessons that belong to units of the selected course
    const courseLessons = lessons.value
      .filter((lesson) => {
        const unit = units.value.find((u) => u.id === lesson.moduleId);
        return unit && unit.courseId === selectedCourse.value;
      })
      .map((lesson) => lesson.id);
    result = result.filter((content) =>
      courseLessons.includes(content.lessonId)
    );
  }

  if (selectedUnit.value && selectedUnit.value !== "all") {
    // Filter by lessons that belong to the selected unit
    const unitLessons = lessons.value
      .filter((lesson) => lesson.moduleId === selectedUnit.value)
      .map((lesson) => lesson.id);
    result = result.filter((content) => unitLessons.includes(content.lessonId));
  }

  if (selectedLesson.value && selectedLesson.value !== "all") {
    result = result.filter(
      (content) => content.lessonId === selectedLesson.value
    );
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (content) =>
        content.title.toLowerCase().includes(query) ||
        content.content.toLowerCase().includes(query)
    );
  }

  return result.sort((a, b) => a.order_number - b.order_number);
});

const availableUnits = computed(() => {
  if (!selectedCourse.value || selectedCourse.value === "all") return [];
  return units.value.filter((unit) => unit.courseId === selectedCourse.value);
});

const availableLessons = computed(() => {
  if (!selectedUnit.value || selectedUnit.value === "all") return [];
  return lessons.value.filter(
    (lesson) => lesson.moduleId === selectedUnit.value
  );
});

// Modal-specific computed properties
const modalAvailableUnits = computed(() => {
  if (!modalSelectedCourse.value || modalSelectedCourse.value === "all")
    return [];
  return units.value.filter(
    (unit) => unit.courseId === modalSelectedCourse.value
  );
});

const modalAvailableLessons = computed(() => {
  if (!modalSelectedUnit.value || modalSelectedUnit.value === "all") return [];
  return lessons.value.filter(
    (lesson) => lesson.moduleId === modalSelectedUnit.value
  );
});

// Pagination computed properties
const totalItems = computed(() => filteredContents.value.length);
const totalPages = computed(() =>
  Math.ceil(totalItems.value / itemsPerPage.value)
);
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() =>
  Math.min(startIndex.value + itemsPerPage.value, totalItems.value)
);

const paginatedContents = computed(() => {
  const start = startIndex.value;
  const end = startIndex.value + itemsPerPage.value;
  return filteredContents.value.slice(start, end);
});

const paginationInfo = computed(() => {
  if (totalItems.value === 0) return "No items to show";
  return `Showing ${startIndex.value + 1} to ${endIndex.value} of ${
    totalItems.value
  } contents`;
});

// Functions
const fetchLessonContents = async () => {
  isLoading.value = true;
  try {
    const response = await lessonContentAPI.getAll();
    const contentsData = response.data || response;
    lessonContents.value = Array.isArray(contentsData) ? contentsData : [];
  } catch (err) {
    error.value = `Failed to fetch lesson contents: ${
      err.message || "Unknown error"
    }`;
    console.error("Error fetching lesson contents:", err);
    lessonContents.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchLessons = async () => {
  try {
    const response = await lessonsAPI.getAll();
    const lessonsData = response.data || response;
    lessons.value = Array.isArray(lessonsData) ? lessonsData : [];
  } catch (err) {
    console.error("Error fetching lessons:", err);
    lessons.value = [];
  }
};

const fetchUnits = async () => {
  try {
    const response = await unitsAPI.getAll();
    const unitsData = response.data || response;
    units.value = Array.isArray(unitsData) ? unitsData : [];
  } catch (err) {
    console.error("Error fetching units:", err);
    units.value = [];
  }
};

const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll();
    const coursesData = response.data || response;
    courses.value = Array.isArray(coursesData) ? coursesData : [];
  } catch (err) {
    console.error("Error fetching courses:", err);
    courses.value = [];
  }
};

const openCreateModal = () => {
  isEditMode.value = false;
  resetForm();
  resetModalSelections();
  showModal.value = true;
};

const openEditModal = (content) => {
  isEditMode.value = true;
  form.id = content.id;
  form.title = content.title;
  form.content = content.content;
  form.mediaUrl = content.mediaUrl;
  form.order_number = content.order_number;
  form.lessonId = content.lessonId;
  form.isActive = content.isActive;
  form.resources = content.resources || [];

  // Determine media type based on existing data
  if (content.mediaUrl) {
    if (
      content.mediaUrl.includes("youtube.com") ||
      content.mediaUrl.includes("youtu.be")
    ) {
      form.mediaType = "youtube_url";
    } else if (content.mediaUrl.includes("embed")) {
      form.mediaType = "embed";
    } else {
      form.mediaType = "url";
    }
  } else {
    form.mediaType = "none";
  }

  // Set the selected filters for the modal
  const lesson = lessons.value.find((l) => l.id === content.lessonId);
  if (lesson) {
    const unit = units.value.find((u) => u.id === lesson.moduleId);
    if (unit) {
      modalSelectedUnit.value = unit.id;
      modalSelectedCourse.value = unit.courseId;
    }
  } else {
    resetModalSelections();
  }

  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  resetForm();
  resetModalSelections();
};

const resetForm = () => {
  form.id = null;
  form.title = "";
  form.content = "";
  form.mediaUrl = "";
  form.mediaType = "none";
  form.mediaFile = null;
  form.resources = [];
  form.resourceFiles = [];
  form.order_number = 1;
  form.lessonId = "";
  form.isActive = true;

  // Reset file inputs
  if (fileInput.value) {
    fileInput.value.value = "";
  }
  if (resourceFileInput.value) {
    resourceFileInput.value.value = "";
  }

  youtubePreview.value = false;
};

const resetModalSelections = () => {
  modalSelectedCourse.value = "all";
  modalSelectedUnit.value = "all";
};

const saveContent = async () => {
  if (!form.title || !form.lessonId) {
    error.value = "Please fill in all required fields";
    return;
  }

  // Validate media type requirements
  if (form.mediaType === "upload" && !form.mediaFile) {
    error.value = "Please select a file to upload";
    return;
  }

  if (
    (form.mediaType === "url" ||
      form.mediaType === "youtube_url" ||
      form.mediaType === "embed") &&
    !form.mediaUrl
  ) {
    error.value = "Please enter a valid URL or embed code";
    return;
  }

  isLoading.value = true;
  try {
    let mediaUrl = form.mediaUrl;
    let resourceUrls = [...form.resources];

    // Handle file upload for media
    if (form.mediaType === "upload" && form.mediaFile) {
      try {
        mediaUrl = await uploadFile(form.mediaFile);
        if (!mediaUrl) {
          throw new Error("Upload completed but no URL returned");
        }
      } catch (uploadError) {
        error.value = uploadError.message;
        return;
      }
    }

    // Handle resource files upload
    if (form.resourceFiles && form.resourceFiles.length > 0) {
      try {
        for (const file of form.resourceFiles) {
          const resourceUrl = await uploadFile(file);
          if (resourceUrl) {
            resourceUrls.push(resourceUrl);
          }
        }
      } catch (uploadError) {
        error.value = `Resource upload failed: ${uploadError.message}`;
        return;
      }
    }

    const contentData = {
      title: form.title,
      content: form.content,
      mediaUrl: mediaUrl,
      mediaType: form.mediaType === "none" ? null : form.mediaType,
      resources: resourceUrls,
      order_number: form.order_number,
      lessonId: form.lessonId,
      isActive: form.isActive,
    };

    if (isEditMode.value) {
      const response = await lessonContentAPI.update(form.id, contentData);
      const index = lessonContents.value.findIndex(
        (content) => content.id === form.id
      );
      if (index !== -1) {
        lessonContents.value[index] = {
          ...lessonContents.value[index],
          ...(response.data || response || contentData),
          id: form.id,
        };
      }
    } else {
      const response = await lessonContentAPI.create(contentData);
      const newContent = response.data || response;
      if (newContent && newContent.id) {
        lessonContents.value.push(newContent);
      } else {
        lessonContents.value.push({
          ...contentData,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    closeModal();
    error.value = "";
  } catch (err) {
    error.value = `Failed to save content: ${err.message || "Unknown error"}`;
    console.error("Error saving content:", err);
  } finally {
    isLoading.value = false;
  }
};

const deleteContent = async (id) => {
  if (!confirm("Are you sure you want to delete this content?")) return;

  isLoading.value = true;
  try {
    await lessonContentAPI.delete(id);
    lessonContents.value = lessonContents.value.filter(
      (content) => content.id !== id
    );
    error.value = "";
  } catch (err) {
    error.value = `Failed to delete content: ${err.message || "Unknown error"}`;
    console.error("Error deleting content:", err);
  } finally {
    isLoading.value = false;
  }
};

const toggleContentStatus = async (content) => {
  const originalStatus = content.isActive;
  try {
    content.isActive = !content.isActive;
    const updatedContent = {
      ...content,
      isActive: content.isActive,
    };
    await lessonContentAPI.update(content.id, updatedContent);
    error.value = "";
  } catch (err) {
    content.isActive = originalStatus;
    error.value = `Failed to update content status: ${
      err.message || "Unknown error"
    }`;
    console.error("Error updating content status:", err);
  }
};

// Helper functions
const getLessonNameById = (lessonId) => {
  const lesson = lessons.value.find(
    (l) => l.id === lessonId || l.id === String(lessonId)
  );
  return lesson ? lesson.title : "Unknown Lesson";
};

const getUnitNameById = (lessonId) => {
  const lesson = lessons.value.find(
    (l) => l.id === lessonId || l.id === String(lessonId)
  );
  if (lesson) {
    const unit = units.value.find(
      (u) => u.id === lesson.moduleId || u.id === String(lesson.moduleId)
    );
    return unit ? unit.title : "Unknown Unit";
  }
  return "Unknown Unit";
};

const getCourseNameById = (lessonId) => {
  const lesson = lessons.value.find(
    (l) => l.id === lessonId || l.id === String(lessonId)
  );
  if (lesson) {
    const unit = units.value.find(
      (u) => u.id === lesson.moduleId || u.id === String(lesson.moduleId)
    );
    if (unit) {
      const course = courses.value.find(
        (c) => c.id === unit.courseId || c.id === String(unit.courseId)
      );
      return course
        ? course.name || course.title || "Unknown Course"
        : "Unknown Course";
    }
  }
  return "Unknown Course";
};

// Pagination functions
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const changeItemsPerPage = (newSize) => {
  itemsPerPage.value = newSize;
  currentPage.value = 1;
};

const resetPagination = () => {
  currentPage.value = 1;
};

// File Upload Functions
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    // Validate file type
    const allowedTypes = [
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
      "video/webm",
      "audio/mp3",
      "audio/wav",
      "audio/m4a",
      "audio/ogg",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (!allowedTypes.includes(file.type)) {
      error.value =
        "Invalid file type. Please select a video, audio, image, PDF, or Office document.";
      event.target.value = "";
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      error.value = "File size must be less than 50MB";
      event.target.value = "";
      return;
    }

    form.mediaFile = file;
    error.value = "";
  }
};

const uploadFile = async (file) => {
  if (!file) return null;

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const result = await uploadAPI.uploadFile(file, "lesson-content", {
      metadata: {
        module: "lesson-contents",
        maxSize: 50 * 1024 * 1024, // 50MB
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          uploadProgress.value = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
        }
      },
    });

    // Return the URL from the response
    return result.url || result.path || result.fileUrl || result.data?.url;
  } catch (err) {
    console.error("Upload error:", err);
    throw new Error(`File upload failed: ${err.message}`);
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

// Drag and Drop functionality
const handleDragOver = (event) => {
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  isDragOver.value = false;
};

const handleDrop = (event) => {
  event.preventDefault();
  isDragOver.value = false;

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    // Simulate the file input change event
    const mockEvent = {
      target: {
        files: [file],
        value: "",
      },
    };
    handleFileUpload(mockEvent);
  }
};

// YouTube Functions
const validateYouTubeUrl = () => {
  const url = form.mediaUrl;
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  youtubePreview.value = youtubeRegex.test(url);
};

// Resource Files Functions
const handleResourceFileUpload = (event) => {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    // Validate file types (allow documents, images, videos, etc.)
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
      "video/webm",
      "audio/mp3",
      "audio/wav",
      "audio/m4a",
      "audio/ogg",
      "text/plain",
    ];

    const invalidFiles = files.filter(
      (file) => !allowedTypes.includes(file.type)
    );
    if (invalidFiles.length > 0) {
      error.value =
        "Some files have invalid types. Please select documents, images, videos, or audio files.";
      event.target.value = "";
      return;
    }

    // Validate file sizes (25MB limit per file)
    const oversizedFiles = files.filter((file) => file.size > 25 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      error.value =
        "Some files are too large. Each file must be less than 25MB.";
      event.target.value = "";
      return;
    }

    form.resourceFiles = [...form.resourceFiles, ...files];
    error.value = "";
  }
};

const removeResourceFile = (index) => {
  form.resourceFiles.splice(index, 1);
};

const removeResourceUrl = (index) => {
  form.resources.splice(index, 1);
};

const addResourceUrl = () => {
  const url = prompt("Enter resource URL:");
  if (url && url.trim()) {
    try {
      new URL(url.trim()); // Validate URL
      form.resources.push(url.trim());
    } catch {
      error.value = "Please enter a valid URL";
    }
  }
};

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchLessonContents(),
    fetchLessons(),
    fetchUnits(),
    fetchCourses(),
  ]);
});

// Watch for changes
watch([selectedCourse, selectedUnit, selectedLesson, searchQuery], () => {
  resetPagination();
});

// Reset dependent filters when parent filter changes
watch(selectedCourse, () => {
  selectedUnit.value = "all";
  selectedLesson.value = "all";
});

watch(selectedUnit, () => {
  selectedLesson.value = "all";
});

// Modal-specific watchers
watch(modalSelectedCourse, () => {
  modalSelectedUnit.value = "all";
  // Don't reset lessonId here as it should persist during editing
});

watch(modalSelectedUnit, () => {
  // Don't reset lessonId here as it should persist during editing
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold">Lesson Contents Management</h1>
          <p class="text-muted-foreground">
            Manage video and text content for lessons
          </p>
        </div>
        <Button @click="openCreateModal">
          <Plus class="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mb-4">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Filters -->
    <Card class="mb-6">
      <div class="px-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <!-- Search -->
          <div class="space-y-2">
            <Label>Search Contents</Label>
            <Input
              v-model="searchQuery"
              placeholder="Search by title or content..."
            />
          </div>

          <!-- Course Filter -->
          <div class="space-y-2">
            <Label>Filter by Course</Label>
            <Select v-model="selectedCourse">
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem
                  v-for="course in courses"
                  :key="course.id"
                  :value="course.id"
                >
                  {{ course.name || course.title || "Unnamed Course" }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Unit Filter -->
          <div class="space-y-2">
            <Label>Filter by Unit</Label>
            <Select
              v-model="selectedUnit"
              :disabled="!selectedCourse || selectedCourse === 'all'"
            >
              <SelectTrigger
                :disabled="!selectedCourse || selectedCourse === 'all'"
              >
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                <SelectItem
                  v-for="unit in availableUnits"
                  :key="unit.id"
                  :value="unit.id"
                >
                  {{ unit.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Lesson Filter -->
          <div class="space-y-2">
            <Label>Filter by Lesson</Label>
            <Select
              v-model="selectedLesson"
              :disabled="!selectedUnit || selectedUnit === 'all'"
            >
              <SelectTrigger
                :disabled="!selectedUnit || selectedUnit === 'all'"
              >
                <SelectValue placeholder="All Lessons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lessons</SelectItem>
                <SelectItem
                  v-for="lesson in availableLessons"
                  :key="lesson.id"
                  :value="lesson.id"
                >
                  {{ lesson.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Items per page -->
          <div class="space-y-2">
            <Label>Items per page</Label>
            <Select
              :model-value="String(itemsPerPage)"
              @update:model-value="changeItemsPerPage(Number($event))"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in itemsPerPageOptions"
                  :key="option"
                  :value="String(option)"
                >
                  {{ option }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>

    <!-- Contents Table -->
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content</TableHead>
            <TableHead>Lesson & Course</TableHead>
            <TableHead>Media</TableHead>
            <TableHead>Resources</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="7" class="text-center">
              <div class="flex items-center justify-center">
                <div
                  class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"
                ></div>
                Loading contents...
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="filteredContents.length === 0">
            <TableCell colspan="7" class="text-center text-muted-foreground">
              No contents found
            </TableCell>
          </TableRow>
          <TableRow
            v-else
            v-for="content in paginatedContents"
            :key="content.id"
          >
            <TableCell>
              <div>
                <div class="font-medium">{{ content.title }}</div>
                <div class="text-sm text-muted-foreground max-w-xs truncate">
                  {{ content.content }}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div>{{ getCourseNameById(content.lessonId) }}</div>
              <div class="text-sm text-muted-foreground">
                {{ getUnitNameById(content.lessonId) }} >
                {{ getLessonNameById(content.lessonId) }}
              </div>
            </TableCell>
            <TableCell>
              <div v-if="content.mediaUrl">
                <a
                  :href="content.mediaUrl"
                  target="_blank"
                  class="text-primary hover:underline flex items-center"
                >
                  <PlayCircle class="h-4 w-4 mr-1" />
                  Media
                </a>
              </div>
              <div v-else class="text-muted-foreground">No media</div>
            </TableCell>
            <TableCell>
              <div v-if="content.resources && content.resources.length > 0">
                <div class="text-sm">
                  {{ content.resources.length }} resource(s)
                </div>
                <div class="flex flex-wrap gap-1 mt-1">
                  <a
                    v-for="(resource, index) in content.resources.slice(0, 2)"
                    :key="index"
                    :href="resource"
                    target="_blank"
                    class="text-xs text-primary hover:underline flex items-center"
                  >
                    <ExternalLink class="h-3 w-3 mr-1" />
                    Resource {{ index + 1 }}
                  </a>
                  <span
                    v-if="content.resources.length > 2"
                    class="text-xs text-muted-foreground"
                  >
                    +{{ content.resources.length - 2 }} more
                  </span>
                </div>
              </div>
              <div v-else class="text-muted-foreground text-sm">
                No resources
              </div>
            </TableCell>
            <TableCell>{{ content.order_number }}</TableCell>
            <TableCell>
              <Button
                @click="toggleContentStatus(content)"
                :variant="content.isActive ? 'default' : 'outline'"
                size="sm"
              >
                {{ content.isActive ? "Active" : "Inactive" }}
              </Button>
            </TableCell>
            <TableCell>
              <div class="flex gap-2">
                <Button
                  @click="openEditModal(content)"
                  variant="ghost"
                  size="icon"
                >
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  @click="deleteContent(content.id)"
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div v-if="totalItems > 0" class="border-t px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <Button
              @click="previousPage"
              :disabled="currentPage === 1"
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
          <div
            class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm text-muted-foreground">
                {{ paginationInfo }}
              </p>
            </div>
            <div>
              <nav
                class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <Button
                  @click="previousPage"
                  :disabled="currentPage === 1"
                  variant="outline"
                  size="icon"
                  class="rounded-r-none"
                >
                  <ChevronLeft class="h-4 w-4" />
                </Button>

                <template v-for="page in Math.min(totalPages, 7)" :key="page">
                  <Button
                    v-if="
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    "
                    @click="goToPage(page)"
                    :variant="page === currentPage ? 'default' : 'outline'"
                    size="icon"
                    class="rounded-none"
                  >
                    {{ page }}
                  </Button>
                  <span
                    v-else-if="
                      page === currentPage - 3 || page === currentPage + 3
                    "
                    class="relative inline-flex items-center px-4 py-2 border border-input bg-background text-sm font-medium"
                  >
                    ...
                  </span>
                </template>

                <Button
                  @click="nextPage"
                  :disabled="currentPage === totalPages"
                  variant="outline"
                  size="icon"
                  class="rounded-l-none"
                >
                  <ChevronRight class="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Modal -->
    <Dialog
      :open="showModal"
      @update:open="
        (val) => {
          if (!val) closeModal();
        }
      "
    >
      <DialogContent class="sm:max-w-[80%] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ isEditMode ? "Edit Content" : "Create New Content" }}
          </DialogTitle>
          <DialogDescription>
            {{
              isEditMode
                ? "Update the lesson content and resources"
                : "Add new content and resources to a lesson"
            }}
          </DialogDescription>
        </DialogHeader>

        <!-- Modal Body -->
        <form @submit.prevent="saveContent" class="space-y-4">
          <!-- Title -->
          <div class="space-y-2">
            <Label for="title">
              Title <span class="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              v-model="form.title"
              required
              placeholder="Enter content title"
            />
          </div>

          <!-- Lesson Selection -->
          <div class="space-y-2">
            <Label for="lesson">
              Lesson <span class="text-destructive">*</span>
            </Label>

            <!-- Course Selection -->
            <div class="space-y-2">
              <Label for="course" class="text-sm text-muted-foreground"
                >Course</Label
              >
              <Select v-model="modalSelectedCourse">
                <SelectTrigger id="course">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem
                    v-for="course in courses"
                    :key="course.id"
                    :value="course.id"
                  >
                    {{ course.name || course.title || "Unnamed Course" }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Unit Selection -->
            <div class="space-y-2">
              <Label for="unit" class="text-sm text-muted-foreground"
                >Unit</Label
              >
              <Select
                v-model="modalSelectedUnit"
                :disabled="
                  !modalSelectedCourse || modalSelectedCourse === 'all'
                "
              >
                <SelectTrigger
                  id="unit"
                  :disabled="
                    !modalSelectedCourse || modalSelectedCourse === 'all'
                  "
                >
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  <SelectItem
                    v-for="unit in modalAvailableUnits"
                    :key="unit.id"
                    :value="unit.id"
                  >
                    {{ unit.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Lesson Selection -->
            <div class="space-y-2">
              <Label for="lessonSelect" class="text-sm text-muted-foreground"
                >Select Lesson</Label
              >
              <Select
                v-model="form.lessonId"
                :disabled="!modalSelectedUnit || modalSelectedUnit === 'all'"
                required
              >
                <SelectTrigger
                  id="lessonSelect"
                  :disabled="!modalSelectedUnit || modalSelectedUnit === 'all'"
                >
                  <SelectValue placeholder="Select Lesson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="lesson in modalAvailableLessons"
                    :key="lesson.id"
                    :value="lesson.id"
                  >
                    {{ lesson.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- Content Field with Quill Editor -->
          <div class="space-y-2">
            <Label> Content </Label>
            <QuillEditor
              v-model:content="form.content"
              theme="snow"
              toolbar="full"
              contentType="html"
              class="bg-background"
              :style="{ minHeight: '200px' }"
              placeholder="Enter detailed content..."
            />
          </div>

          <!-- Media Type Selection -->
          <div class="space-y-2">
            <Label for="mediaType"> Media Type </Label>
            <Select v-model="form.mediaType">
              <SelectTrigger id="mediaType">
                <SelectValue placeholder="No Media" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Media</SelectItem>
                <SelectItem value="url">Direct URL</SelectItem>
                <SelectItem value="upload">File Upload</SelectItem>
                <SelectItem value="youtube_url">YouTube URL</SelectItem>
                <SelectItem value="embed">Embed Code</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Media URL (for direct URL) -->
          <div v-if="form.mediaType === 'url'" class="space-y-2">
            <Label for="mediaUrl"> Media URL </Label>
            <Input
              id="mediaUrl"
              type="url"
              v-model="form.mediaUrl"
              placeholder="https://example.com/media/video.mp4"
            />
          </div>

          <!-- File Upload -->
          <div v-if="form.mediaType === 'upload'" class="space-y-2">
            <Label> Upload File </Label>
            <div
              :class="[
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                isDragOver ? 'border-primary bg-primary/5' : 'border-input',
              ]"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
              @click="$refs.fileInput?.click()"
            >
              <input
                type="file"
                ref="fileInput"
                @change="handleFileUpload"
                accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.ppt,.pptx"
                class="hidden"
              />

              <!-- Upload Area -->
              <div v-if="!form.mediaFile && !isUploading">
                <Upload
                  :class="[
                    'mx-auto h-12 w-12 mb-2',
                    isDragOver ? 'text-primary' : 'text-muted-foreground',
                  ]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click.stop="$refs.fileInput?.click()"
                >
                  <Upload class="mr-2 h-4 w-4" />
                  Choose File
                </Button>
                <p
                  :class="[
                    'mt-2 text-sm',
                    isDragOver ? 'text-primary' : 'text-muted-foreground',
                  ]"
                >
                  Or drag and drop a file here
                </p>
                <p class="text-xs text-muted-foreground mt-1">
                  Supports: Video, Audio, Image, PDF, Office documents (Max:
                  50MB)
                </p>
              </div>

              <!-- Selected File Info -->
              <div
                v-else-if="form.mediaFile && !isUploading"
                class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <FileText
                      class="h-5 w-5 text-green-600 dark:text-green-400 mr-2"
                    />
                    <div class="text-left">
                      <p
                        class="text-sm font-medium text-green-800 dark:text-green-200"
                      >
                        {{ form.mediaFile.name }}
                      </p>
                      <p class="text-xs text-green-600 dark:text-green-400">
                        {{ (form.mediaFile.size / 1024 / 1024).toFixed(2) }} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    @click.stop="
                      form.mediaFile = null;
                      $refs.fileInput.value = '';
                    "
                  >
                    <X class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <!-- Upload Progress -->
              <div v-else-if="isUploading" class="space-y-3">
                <div class="flex items-center justify-center">
                  <div
                    class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"
                  ></div>
                  <span class="text-sm"
                    >Uploading... {{ uploadProgress }}%</span
                  >
                </div>
                <Progress :model-value="uploadProgress" class="w-full" />
                <p class="text-xs text-muted-foreground">
                  {{ form.mediaFile?.name }}
                </p>
              </div>
            </div>
          </div>

          <!-- YouTube URL -->
          <div v-if="form.mediaType === 'youtube_url'" class="space-y-2">
            <Label for="youtubeUrl"> YouTube URL </Label>
            <Input
              id="youtubeUrl"
              type="url"
              v-model="form.mediaUrl"
              @input="validateYouTubeUrl"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <div v-if="youtubePreview" class="mt-2 p-2 bg-muted rounded border">
              <p class="text-sm text-muted-foreground mb-1">Preview:</p>
              <div
                class="aspect-video bg-muted-foreground/10 rounded flex items-center justify-center"
              >
                <span class="text-muted-foreground">YouTube Video Preview</span>
              </div>
            </div>
          </div>

          <!-- Embed Code -->
          <div v-if="form.mediaType === 'embed'" class="space-y-2">
            <Label for="embedCode"> Embed Code or URL </Label>
            <Input
              id="embedCode"
              v-model="form.mediaUrl"
              placeholder="Enter embed iframe code or URL..."
            />
          </div>

          <!-- Order Number -->
          <div class="space-y-2">
            <Label for="order">Order Number</Label>
            <Input
              id="order"
              type="number"
              v-model="form.order_number"
              min="1"
            />
          </div>

          <!-- Resources Section -->
          <div class="space-y-4">
            <Label class="text-base font-medium"> Resources </Label>

            <!-- Existing Resource URLs -->
            <div v-if="form.resources.length > 0" class="space-y-2">
              <Label class="text-sm text-muted-foreground"
                >Current Resources</Label
              >
              <div class="space-y-2">
                <div
                  v-for="(resource, index) in form.resources"
                  :key="index"
                  class="flex items-center justify-between p-2 bg-muted rounded border"
                >
                  <a
                    :href="resource"
                    target="_blank"
                    class="text-primary hover:underline truncate flex-1 mr-2"
                  >
                    {{ resource }}
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    @click="removeResourceUrl(index)"
                  >
                    <X class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- Add Resource URL -->
            <div class="space-y-2">
              <Label class="text-sm text-muted-foreground"
                >Add Resource URL</Label
              >
              <Button
                type="button"
                variant="outline"
                @click="addResourceUrl"
                class="w-full"
              >
                <Plus class="mr-2 h-4 w-4" />
                Add Resource URL
              </Button>
            </div>

            <!-- Upload Resource Files -->
            <div class="space-y-2">
              <Label class="text-sm text-muted-foreground"
                >Upload Resource Files</Label
              >
              <div class="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  multiple
                  @change="handleResourceFileUpload"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*,video/*,audio/*,.txt"
                  class="hidden"
                  ref="resourceFileInput"
                />
                <Button
                  type="button"
                  variant="outline"
                  @click="$refs.resourceFileInput?.click()"
                >
                  <Upload class="mr-2 h-4 w-4" />
                  Choose Files
                </Button>
                <p class="text-xs text-muted-foreground mt-2">
                  Supports: PDF, Office documents, Images, Videos, Audio files
                  (Max: 25MB each)
                </p>
              </div>

              <!-- Selected Resource Files -->
              <div v-if="form.resourceFiles.length > 0" class="space-y-2">
                <Label class="text-sm text-muted-foreground"
                  >Files to Upload</Label
                >
                <div class="space-y-2">
                  <div
                    v-for="(file, index) in form.resourceFiles"
                    :key="index"
                    class="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border"
                  >
                    <div class="flex items-center">
                      <FileText
                        class="h-4 w-4 text-green-600 dark:text-green-400 mr-2"
                      />
                      <div>
                        <p
                          class="text-sm font-medium text-green-800 dark:text-green-200"
                        >
                          {{ file.name }}
                        </p>
                        <p class="text-xs text-green-600 dark:text-green-400">
                          {{ (file.size / 1024 / 1024).toFixed(2) }} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      @click="removeResourceFile(index)"
                    >
                      <X class="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div class="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              :checked="form.isActive"
              @update:checked="form.isActive = $event"
            />
            <Label for="isActive" class="font-normal cursor-pointer">
              Active
            </Label>
          </div>

          <!-- Modal Footer -->
          <DialogFooter>
            <Button type="button" @click="closeModal" variant="outline">
              Cancel
            </Button>
            <Button type="submit" :disabled="isLoading || isUploading">
              <div
                v-if="isLoading || isUploading"
                class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
              ></div>
              <span v-if="isUploading">Uploading...</span>
              <span v-else-if="isLoading">{{
                isEditMode ? "Updating..." : "Creating..."
              }}</span>
              <span v-else>{{ isEditMode ? "Update" : "Create" }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
