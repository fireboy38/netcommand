<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Setting /></el-icon>
      基础设备配置
    </div>
    <el-form label-width="110px" size="default" class="config-form">
      <el-form-item label="主机名称">
        <el-input
          v-model="cfg.hostname"
          placeholder="例: Core-SW-01"
          clearable
          @change="onChange"
        >
          <template #prefix><el-icon><Monitor /></el-icon></template>
        </el-input>
      </el-form-item>
      <el-form-item label="登录Banner">
        <el-input
          v-model="cfg.banner"
          type="textarea"
          :rows="2"
          placeholder="登录提示信息（可选）"
          resize="none"
          @change="onChange"
        />
      </el-form-item>
      <el-divider content-position="left">安全设置</el-divider>
      <el-form-item label="Enable密码">
        <el-switch v-model="cfg.enableSecret" active-text="" inactive-text="" />
        <span style="margin-left:8px;font-size:12px;color:#909399;">
          {{ cfg.enableSecret ? '已启用' : '未启用' }}
        </span>
      </el-form-item>
      <el-form-item v-if="cfg.enableSecret" label="密码">
        <el-input
          v-model="cfg.enablePassword"
          type="password"
          show-password
          placeholder="输入超级用户密码"
          @change="onChange"
        />
      </el-form-item>
      <el-divider content-position="left">系统信息</el-divider>
      <el-form-item label="控制台超时">
        <el-slider
          v-model="cfg.consoleTimeout"
          :min="1" :max="60" show-input :show-input-controls="false"
          input-size="small"
          style="width:100%"
          @change="onChange"
        />
        <template #suffix>分钟</template>
      </el-form-item>
      <el-form-item label="联系人">
        <el-input
          v-model="cfg.sysContact"
          placeholder="网络管理员联系方式（可选）"
          clearable
          @change="onChange"
        />
      </el-form-item>
      <el-form-item label="位置">
        <el-input
          v-model="cfg.sysLocation"
          placeholder="设备安装位置（可选）"
          clearable
          @change="onChange"
        />
      </el-form-item>

      <!-- 模块预览 -->
      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('basic') || '<!-- 配置主机名后自动生成 -->' }}</pre>
        <el-button
          size="small"
          text
          type="primary"
          style="margin-top:8px"
          @click="copyModule('basic')"
          v-if="store.generateModuleCommands('basic')"
        >
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.basic)

function onChange() {
  // 响应式，无需手动操作
}

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>
