<!--
  新数网络调试工具 (NetCommand)
  Copyright (c) 2026 四川新数科技有限公司. All rights reserved.
  用户管理页面（仅管理员可访问）
-->
<template>
  <div class="user-manage">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="$router.push('/')">返回工具</el-button>
        <h2><el-icon><UserFilled /></el-icon> 用户管理</h2>
      </div>
      <el-button type="primary" :icon="Plus" @click="openAddDialog">新增用户</el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <span class="stat-num">{{ authStore.userList.length }}</span>
        <span class="stat-label">总用户数</span>
      </div>
      <div class="stat-card admin">
        <span class="stat-num">{{ adminCount }}</span>
        <span class="stat-label">管理员</span>
      </div>
      <div class="stat-card active">
        <span class="stat-num">{{ enabledCount }}</span>
        <span class="stat-label">已启用</span>
      </div>
    </div>

    <!-- 用户表格 -->
    <div class="table-card module-card">
      <el-table
        :data="authStore.userList"
        stripe
        style="width: 100%"
        row-class-name="user-row"
        empty-text="暂无用户数据"
      >
        <el-table-column label="用户信息" min-width="200">
          <template #default="{ row }">
            <div class="user-info-cell">
              <div class="avatar" :style="{ background: avatarColor(row.username) }">
                {{ row.realName?.charAt(0) || row.username.charAt(0).toUpperCase() }}
              </div>
              <div class="info-text">
                <strong>{{ row.realName || row.username }}</strong>
                <small>@{{ row.username }}</small>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag
              :type="roleTagType(row.role)"
              size="small"
              effect="light"
            >
              {{ roleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="enabled" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'danger'" size="small" effect="light">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="最后登录" width="170">
          <template #default="{ row }">
            {{ row.lastLogin ? formatTime(row.lastLogin) : '从未登录' }}
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button size="small" type="primary" text @click="openEditDialog(row)">
                <el-icon :size="13"><Edit /></el-icon> 编辑
              </el-button>
              <el-button
                size="small"
                :type="row.enabled ? 'warning' : 'success'"
                text
                @click="toggleUser(row)"
              >
                {{ row.enabled ? '禁用' : '启用' }}
              </el-button>
              <el-popconfirm
                :title="`确认删除用户「${row.username}」？`"
                confirm-button-text="删除"
                cancel-button-text="取消"
                confirm-button-type="danger"
                @confirm="handleDelete(row.username)"
              >
                <template #reference>
                  <el-button
                    size="small"
                    type="danger"
                    text
                    :disabled="row.username === 'admin'"
                  >
                    <el-icon :size="13"><Delete /></el-icon> 删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="dialogFormRef"
        :model="dialogForm"
        :rules="dialogRules"
        label-width="80px"
        size="large"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="dialogForm.username"
            placeholder="用于登录的用户名"
            :disabled="isEdit"
            maxlength="20"
          />
        </el-form-item>

        <el-form-item label="姓名" prop="realName">
          <el-input
            v-model="dialogForm.realName"
            placeholder="显示名称"
            maxlength="16"
          />
        </el-form-item>

        <el-form-item :label="isEdit ? '新密码' : '密码'" prop="password">
          <el-input
            v-model="dialogForm.password"
            type="password"
            show-password
            :placeholder="isEdit ? '留空则不修改密码' : '设置登录密码'"
          />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="dialogForm.role" style="width: 100%" :disabled="isEdit && dialogForm.username === 'admin'">
            <el-option value="admin" label="管理员 - 拥有所有权限" />
            <el-option value="user" label="操作员 - 可使用全部功能" />
            <el-option value="viewer" label="查看者 - 仅可查看配置" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '创建用户' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAuthStore } from '../store/auth'
import type { UserInfo, UserRole } from '../types'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Plus, Edit, Delete, UserFilled,
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const editUsername = ref('')
const dialogFormRef = ref<FormInstance>()

// ===== 表单数据 =====
const dialogForm = reactive({
  username: '',
  realName: '',
  password: '',
  role: 'user' as UserRole,
})

const dialogRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '3-20 个字符', trigger: 'blur' },
  ],
  realName: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
  ],
  password: [
    {
      required: !isEdit.value,
      validator: (_rule: any, value: string, callback: any) => {
        if (!isEdit.value && !value) {
          callback(new Error('请输入密码'))
        } else if (value && value.length < 6) {
          callback(new Error('至少 6 个字符'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// ===== 计算属性 =====
const adminCount = computed(() => authStore.userList.filter(u => u.role === 'admin').length)
const enabledCount = computed(() => authStore.userList.filter(u => u.enabled).length)

// ===== 工具函数 =====
function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = { admin: '管理员', user: '操作员', viewer: '查看者' }
  return map[role] || role
}
function roleTagType(role: UserRole): '' | 'danger' | 'warning' | 'info' {
  const map: Record<UserRole, '' | 'danger' | 'warning' | 'info'> = { admin: 'danger', user: '', viewer: 'info' }
  return map[role]
}
function avatarColor(name: string): string {
  const colors = [
    '#409eff', '#67c23a', '#e6a23c', '#f56c6c',
    '#9b59b6', '#1abc9c', '#e74c3c', '#3498db',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return colors[hash % colors.length]
}
function formatTime(iso?: string): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ===== 对话框操作 =====
function openAddDialog() {
  isEdit.value = false
  editUsername.value = ''
  Object.assign(dialogForm, { username: '', realName: '', password: '', role: 'user' })
  dialogVisible.value = true
}

function openEditDialog(user: UserInfo) {
  isEdit.value = true
  editUsername.value = user.username
  Object.assign(dialogForm, {
    username: user.username,
    realName: user.realName,
    password: '',
    role: user.role,
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await dialogFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  await new Promise(resolve => setTimeout(resolve, 300))

  let result
  if (isEdit.value) {
    result = authStore.updateUser(editUsername.value, {
      realName: dialogForm.realName,
      role: dialogForm.role,
      newPassword: dialogForm.password || undefined,
    })
  } else {
    result = authStore.addUser({
      username: dialogForm.username,
      password: dialogForm.password,
      realName: dialogForm.realName,
      role: dialogForm.role,
    })
  }

  submitting.value = false

  if (result.success) {
    ElMessage.success(result.message)
    dialogVisible.value = false
  } else {
    ElMessage.error(result.message)
  }
}

function toggleUser(user: UserInfo) {
  const result = authStore.updateUser(user.username, { enabled: !user.enabled })
  ElMessage[result.success ? 'success' : 'warning'](result.message)
}

function handleDelete(username: string) {
  const result = authStore.deleteUser(username)
  ElMessage[result.success ? 'success' : 'error'](result.message)
}
</script>

<style scoped>
.user-manage {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 页头 ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-left h2 {
  font-size: 20px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-left .el-icon {
  color: var(--accent-color);
}

/* ===== 统计卡片 ===== */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: transform 0.2s;
}
.stat-card:hover { transform: translateY(-2px); }
.stat-card.admin { border-left: 4px solid #f56c6c; }
.stat-card.active { border-left: 4px solid #67c23a; }
.stat-num {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}
.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}

/* ===== 表格 ===== */
.table-card { overflow: hidden; }
:deep(.el-table .user-row td) { height: 56px; }

.user-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}
.info-text {
  display: flex;
  flex-direction: column;
}
.info-text strong { font-size: 14px; color: var(--text-primary); }
.info-text small { font-size: 12px; color: var(--text-muted); }

.action-btns {
  display: flex;
  align-items: center;
  gap: 0;
}
</style>
