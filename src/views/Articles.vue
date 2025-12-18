<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Articles</h2>
        <p class="text-muted-foreground mt-1">
          Manage educational articles and content
        </p>
      </div>
      <Button @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" />
        Create Article
      </Button>
    </div>

    <!-- Statistics Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Total Articles</CardTitle>
          <FileText class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ articles.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Categories</CardTitle>
          <Folder class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ uniqueCategories.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Recent Articles</CardTitle>
          <Clock class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ recentArticles }}</div>
        </CardContent>
      </Card>
    </div>

    <!-- Filters and Search -->
    <Card>
      <CardHeader>
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <Input v-model="searchQuery" placeholder="Search articles..." />
          </div>
          <Select
            v-model="filterCategory"
            @update:model-value="(value) => (filterCategory = value)"
          >
            <SelectTrigger class="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem
                v-for="category in uniqueCategories"
                :key="category"
                :value="category"
              >
                {{ category }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
            ></div>
            <p class="mt-4 text-muted-foreground">Loading articles...</p>
          </div>
        </div>

        <div
          v-else-if="filteredArticles.length === 0"
          class="text-center py-12"
        >
          <FileText class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p class="text-muted-foreground">No articles found</p>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            v-for="article in filteredArticles"
            :key="article.id"
            class="overflow-hidden"
          >
            <div
              v-if="article.image"
              class="aspect-video w-full overflow-hidden"
            >
              <img
                :src="article.image"
                :alt="article.title"
                class="w-full h-full object-cover"
              />
            </div>
            <CardHeader>
              <div class="flex items-start justify-between gap-2">
                <CardTitle class="text-lg line-clamp-2">{{
                  article.title
                }}</CardTitle>
              </div>
              <Badge variant="secondary" class="w-fit">{{
                article.category
              }}</Badge>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground line-clamp-3">
                {{ getArticlePreview(article) }}
              </p>
            </CardContent>
            <CardContent class="pt-0">
              <div class="flex justify-end gap-2">
                <Button @click="viewArticle(article)" variant="ghost" size="sm">
                  <Eye class="h-4 w-4" />
                </Button>
                <Button @click="editArticle(article)" variant="ghost" size="sm">
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  @click="deleteArticle(article.id)"
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>

    <!-- Create/Edit Dialog -->
    <Dialog :open="showDialog" @update:open="showDialog = $event">
      <DialogContent class="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{
            isEditing ? "Edit Article" : "Create Article"
          }}</DialogTitle>
        </DialogHeader>

        <form @submit.prevent="submitForm" class="space-y-4">
          <div class="space-y-2">
            <Label>Title <span class="text-red-500">*</span></Label>
            <Input
              v-model="formData.title"
              placeholder="Enter article title"
              required
            />
          </div>

          <div class="space-y-2">
            <Label>Category <span class="text-red-500">*</span></Label>
            <Select
              v-model="formData.category"
              @update:model-value="(value) => (formData.category = value)"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="category in POPULAR_CATEGORIES"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Image URL</Label>
            <Input
              v-model="formData.image"
              type="url"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div class="space-y-2">
            <Label>Content</Label>
            <EditorJS
              v-model="formData.content"
              placeholder="Start writing your article..."
              class="border rounded-md p-4"
            />
          </div>

          <div class="flex justify-end gap-3">
            <Button type="button" variant="outline" @click="closeDialog"
              >Cancel</Button
            >
            <Button type="submit" :disabled="submitting">
              {{ submitting ? "Saving..." : isEditing ? "Update" : "Create" }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- View Article Dialog -->
    <Dialog :open="showViewDialog" @update:open="showViewDialog = $event">
      <DialogContent class="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ selectedArticle?.title }}</DialogTitle>
          <Badge variant="secondary" class="w-fit mt-2">{{
            selectedArticle?.category
          }}</Badge>
        </DialogHeader>

        <div v-if="selectedArticle" class="space-y-4">
          <div
            v-if="selectedArticle.image"
            class="aspect-video w-full overflow-hidden rounded-lg"
          >
            <img
              :src="selectedArticle.image"
              :alt="selectedArticle.title"
              class="w-full h-full object-cover"
            />
          </div>

          <EditorJS
            v-if="selectedArticle.content"
            :model-value="selectedArticle.content"
            :read-only="true"
            class="prose prose-sm max-w-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { articlesAPI } from "../utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import EditorJS from "@/components/EditorJS.vue";
import {
  Plus,
  FileText,
  Folder,
  Clock,
  Eye,
  Edit,
  Trash2,
} from "lucide-vue-next";

// Most used article categories
const POPULAR_CATEGORIES = [
  "World News",
  "Politics",
  "Business & Economy",
  "Technology",
  "Science & Health",
  "Sports",
  "Entertainment",
  "Education",
  "Environment",
  "Culture",
 "Travel",
];

// State
const articles = ref([]);
const selectedArticle = ref(null);
const loading = ref(false);
const submitting = ref(false);
const showDialog = ref(false);
const showViewDialog = ref(false);
const isEditing = ref(false);
const searchQuery = ref("");
const filterCategory = ref("all");

// Form data
const formData = ref({
  id: null,
  title: "",
  category: "",
  image: "",
  content: null,
});

// Computed properties
const uniqueCategories = computed(() => {
  const categories = articles.value.map((a) => a.category).filter(Boolean);
  return [...new Set(categories)];
});

const recentArticles = computed(() => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return articles.value.filter((a) => {
    if (!a.created_at) return false;
    return new Date(a.created_at) > sevenDaysAgo;
  }).length;
});

const filteredArticles = computed(() => {
  return articles.value.filter((article) => {
    const matchesSearch =
      article.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      article.category?.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesCategory =
      filterCategory.value === "all" ||
      article.category === filterCategory.value;
    return matchesSearch && matchesCategory;
  });
});

// Methods
const fetchArticles = async () => {
  loading.value = true;
  try {
    const response = await articlesAPI.getAll();
    articles.value = Array.isArray(response) ? response : response.data || [];
  } catch (error) {
    console.error("Error fetching articles:", error);
  } finally {
    loading.value = false;
  }
};

const getArticlePreview = (article) => {
  if (!article.content?.blocks?.length) return "No content available";
  const firstBlock = article.content.blocks.find((b) => b.type === "paragraph");
  return (
    firstBlock?.data?.text?.substring(0, 150) + "..." || "No content available"
  );
};

const openCreateDialog = () => {
  isEditing.value = false;
  resetForm();
  showDialog.value = true;
};

const editArticle = (article) => {
  isEditing.value = true;
  formData.value = {
    id: article.id,
    title: article.title,
    category: article.category,
    image: article.image || "",
    content: article.content || null,
  };
  showDialog.value = true;
};

const viewArticle = (article) => {
  selectedArticle.value = article;
  showViewDialog.value = true;
};

const closeDialog = () => {
  showDialog.value = false;
  resetForm();
};

const resetForm = () => {
  formData.value = {
    id: null,
    title: "",
    category: "",
    image: "",
    content: null,
  };
};

const submitForm = async () => {
  submitting.value = true;
  try {
    if (isEditing.value) {
      await articlesAPI.update(formData.value.id, formData.value);
    } else {
      await articlesAPI.create(formData.value);
    }
    closeDialog();
    fetchArticles();
  } catch (error) {
    console.error("Error saving article:", error);
    alert("Failed to save article. Please try again.");
  } finally {
    submitting.value = false;
  }
};

const deleteArticle = async (id) => {
  if (!confirm("Are you sure you want to delete this article?")) return;

  try {
    await articlesAPI.delete(id);
    fetchArticles();
  } catch (error) {
    console.error("Error deleting article:", error);
    alert("Failed to delete article. Please try again.");
  }
};

// Lifecycle
onMounted(() => {
  fetchArticles();
});
</script>
