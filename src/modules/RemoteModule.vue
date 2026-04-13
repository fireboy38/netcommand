<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Lock /></el-icon>
      远程管理 (SSH / Telnet)
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('remote', val)" />
    </div>

    <template v-if="cfg.enabled">
      <el-form label-width="100px" size="default" class="config-form">
        <!-- 协议选择 -->
        <el-form-item label="协议">
          <el-checkbox v-model="cfg.sshEnabled">SSH</el-checkbox>
          <el-checkbox v-model="cfg.telnetEnabled">Telnet</el-checkbox>
          <span class="form-hint">（建议仅开启SSH）</span>
        </el-form-item>

        <!-- SSH配置 -->
        <template v-if="cfg.sshEnabled">
          <el-divider content-position="left">SSH 配置</el-divider>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="SSH版本" label-width="70px" size="default">
                <el-radio-group v-model="cfg.sshVersion" size="default">
                  <el-radio value="2">SSHv2</el-radio>
                  <el-radio value="all">全部</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="SSH端口" label-width="70px" size="default">
                <el-input-number v-model.number="cfg.sshPort" :min="1" :max="65535"
                  size="default" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <!-- AAA用户 -->
          <div class="sub-section">
            <div class="sub-header">
              <span>管理用户</span>
              <el-button type="primary" text size="small" @click="addUser"
                style="margin-left:auto"><el-icon :size="13"><Plus /></el-icon> 添加</el-button>
            </div>
            <TransitionGroup name="list" tag="div">
              <div v-for="(u, idx) in cfg.authUsers" :key="'u'+idx" class="user-card">
                <el-input v-model="u.username" placeholder="用户名" size="small"
                  style="flex:1;margin-right:6px;" />
                <el-input v-model="u.password" type="password" show-password
                  placeholder="密码" size="small" style="flex:1;margin-right:6px;" />
                <el-select v-model.number="u.privilege" size="small" style="width:90px;margin-right:6px;">
                  <el-option label="1" :value="1" />
                  <el-option label="3" :value="3" />
                  <el-option label="10" :value="10" />
                  <el-option label="15" :value="15" />
                </el-select>
                <el-button :icon="Delete" type="danger" text circle size="small"
                  @click="cfg.authUsers.splice(idx,1)"
                  :disabled="cfg.authUsers.length <= 1" />
              </div>
            </TransitionGroup>
          </div>
        </template>

        <!-- Telnet配置 -->
        <template v-if="cfg.telnetEnabled && !cfg.sshEnabled">
          <el-divider content-position="left">Telnet 配置</el-divider>
          <el-form-item label="端口" label-width="70px" size="default">
            <el-input-number v-model.number="cfg.telnetPort" :min="1" :max="65535"
              size="default" style="width:160px" />
          </el-form-item>
          <el-alert title="⚠️ Telnet 以明文传输数据，存在安全风险，生产环境不建议使用"
            type="warning" :closable="false" show-icon style="margin-top:8px;" />
        </template>
      </el-form>

      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('remote') || '<!-- 配置后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('remote')" v-if="store.generateModuleCommands('remote')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置远程管理" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.remote)

function addUser() {
  if (!cfg.value) return
  cfg.value.authUsers.push({ username: '', password: '', privilege: 15 })
}

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.form-hint {
  font-size: 12px; color: #909399; margin-left: 8px;
}
.sub-section { margin: 12px 0; }
.sub-header {
  display: flex; align-items: center;
  font-size: 13px; font-weight: 600; color: var(--text-primary);
}
.user-card {
  display: flex; align-items: center;
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 10px; margin-bottom: 6px;
}
.list-enter-active, .list-leave-active { transition: all 0.25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
