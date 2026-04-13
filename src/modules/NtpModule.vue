<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Timer /></el-icon>
      NTP 时间同步
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('ntp', val)" />
    </div>

    <template v-if="cfg.enabled">
      <el-form label-width="100px" size="default" class="config-form">
        <el-form-item label="工作模式">
          <el-radio-group v-model="cfg.mode" @change="onChange">
            <el-radio value="client">客户端</el-radio>
            <el-radio value="server">服务器</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="cfg.mode === 'client'">
          <el-form-item label="NTP服务器">
            <el-input
              v-model="cfg.servers"
              placeholder="NTP服务器地址，多个逗号分隔 (例: ntp.aliyun.com, ntp.tencent.com)"
              @change="onChange"
            >
              <template #prefix><el-icon :size="14"><Connection /></el-icon></template>
            </el-input>
            <div class="quick-servers">
              <el-tag type="info" effect="plain" class="server-tag" @click="addServer('ntp.aliyun.com')">阿里云</el-tag>
              <el-tag type="info" effect="plain" class="server-tag" @click="addServer('ntp.tencent.com')">腾讯云</el-tag>
              <el-tag type="info" effect="plain" class="server-tag" @click="addServer('cn.ntp.org.cn')">中国NTP</el-tag>
              <el-tag type="info" effect="plain" class="server-tag" @click="addServer('pool.ntp.org')">全球Pool</el-tag>
            </div>
          </el-form-item>
        </template>

        <el-divider content-position="left">时区设置</el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="时区" label-width="70px" size="default">
              <el-select v-model="cfg.timezone" filterable allow-create
                placeholder="选择或输入时区" size="default" style="width:100%" @change="onChange">
                <el-option label="Beijing (UTC+8)" value="Beijing" />
                <el-option label="Shanghai (UTC+8)" value="Shanghai" />
                <el-option label="Hongkong (UTC+8)" value="Hongkong" />
                <el-option label="UTC" value="UTC" />
                <el-option label="Tokyo (UTC+9)" value="Tokyo" />
                <el-option label="Singapore (UTC+8)" value="Singapore" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="认证" label-width="70px" size="default">
              <el-switch v-model="cfg.authentication" active-text="" inactive-text=""
                @change="onChange" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-alert v-if="cfg.mode === 'server'"
          title="⚠️ 作为NTP服务器时，设备需要有稳定的外部时间源（如GPS/原子钟），否则不建议开启"
          type="warning" :closable="false" show-icon style="margin-top:8px;" />
      </el-form>

      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('ntp') || '<!-- 配置后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('ntp')" v-if="store.generateModuleCommands('ntp')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置NTP" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.ntp)

function addServer(server: string) {
  if (!cfg.value) return
  const current = cfg.value.servers.trim()
  if (!current) {
    cfg.value.servers = server
  } else if (!current.includes(server)) {
    cfg.value.servers = current + ', ' + server
  }
}

function onChange() { /* reactive */ }

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.quick-servers {
  display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
}
.server-tag {
  cursor: pointer; transition: all 0.15s; font-size: 12px;
}
.server-tag:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
  transform: translateY(-1px);
}
</style>
