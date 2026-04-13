<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Tickets /></el-icon>
      日志配置
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('log', val)" />
    </div>

    <template v-if="cfg.enabled">
      <el-form label-width="120px" size="default" class="config-form">

        <!-- 信息中心开关 -->
        <el-form-item label="启用信息中心">
          <el-switch v-model="cfg.enableInfoCenter" active-text="开启" inactive-text="关闭" />
        </el-form-item>

        <!-- 日志级别 -->
        <el-form-item label="默认日志级别">
          <el-select v-model="cfg.defaultLevel" style="width:100%">
            <el-option label="调试 (debugging)" value="debugging" />
            <el-option label="信息 (informational)" value="informational" />
            <el-option label="通知 (notification)" value="notification" />
            <el-option label="警告 (warning)" value="warning" />
            <el-option label="错误 (error)" value="error" />
            <el-option label="紧急 (critical)" value="critical" />
            <el-option label="警报 (alerting)" value="alerting" />
            <el-option label="紧急 (emergency)" value="emergency" />
          </el-select>
        </el-form-item>

        <!-- 时间戳格式 -->
        <el-form-item label="时间戳格式">
          <el-radio-group v-model="cfg.timestampFormat" size="default">
            <el-radio value="date">日期时间 (YYYY-MM-DD HH:mm:ss)</el-radio>
            <el-radio value="boot">开机时长 (uptime)</el-radio>
            <el-radio value="none">无时间戳</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 日志缓冲区 -->
        <el-form-item label="日志缓冲区大小">
          <el-input-number v-model.number="cfg.bufferSize" :min="1" :max="10240"
            placeholder="单位: KB" style="width:100%"><template #append>KB</template></el-input-number>
        </el-form-item>

        <!-- Syslog服务器 -->
        <el-divider content-position="left">Syslog 服务器</el-divider>

        <el-form-item label="启用Syslog">
          <el-switch v-model="cfg.enableSyslog" />
        </el-form-item>
        <template v-if="cfg.enableSyslog">
          <div class="sub-section">
            <div class="sub-header">
              <span>Syslog 目标</span>
              <el-button type="primary" text size="small" @click="addSyslogServer"
                style="margin-left:auto"><el-icon :size="13"><Plus /></el-icon> 添加服务器</el-button>
            </div>
            <TransitionGroup name="list" tag="div">
              <div v-for="(s, idx) in cfg.syslogServers" :key="'s'+idx" class="syslog-card">
                <el-input v-model="s.host" placeholder="目标主机IP或域名" size="small"
                  style="flex:1;margin-right:6px;" />
                <el-input-number v-model.number="s.port" :min="1" :max="65535" placeholder="端口(UDP)"
                  size="small" :controls="false" style="width:110px;margin-right:6px;" />
                <el-select v-model="s.facility" size="small" style="width:130px;margin-right:6px;">
                  <el-option label="local0" value="local0" />
                  <el-option label="local1" value="local1" />
                  <el-option label="local2" value="local2" />
                  <el-option label="local3" value="local3" />
                  <el-option label="local4" value="local4" />
                  <el-option label="local5" value="local5" />
                  <el-option label="local6" value="local6" />
                  <el-option label="local7" value="local7" />
                </el-select>
                <el-select v-model="s.level" size="small" style="width:110px;margin-right:6px;">
                  <el-option label="info" value="informational" />
                  <el-option label="warning" value="warning" />
                  <el-option label="error" value="error" />
                  <el-option label="debug" value="debugging" />
                  <el-option label="all" value="debugging" />
                </el-select>
                <el-button :icon="Delete" type="danger" text circle size="small"
                  @click="cfg.syslogServers.splice(idx,1)" />
              </div>
            </TransitionGroup>
            <span class="form-hint">默认UDP端口514。facility用于区分不同设备来源。</span>
          </div>
        </template>

        <!-- 日志文件/Flash保存 -->
        <el-divider content-position="left">日志存储</el-divider>
        <el-form-item label="保存到Flash">
          <el-switch v-model="cfg.saveToFlash" />
        </el-form-item>
        <el-form-item label="最大文件数" v-if="cfg.saveToFlash">
          <el-input-number v-model.number="cfg.maxLogFiles" :min="1" :max="50" style="width:100%" />
        </el-form-item>

        <!-- 命令输出过滤 -->
        <el-divider content-position="left">命令日志控制</el-divider>
        <el-form-item label="记录操作日志">
          <el-switch v-model="cfg.recordCommands" />
        </el-form-item>

      </el-form>

      <!-- 预览 -->
      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('log') || '<!-- 配置后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('log')" v-if="store.generateModuleCommands('log')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置日志功能" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.log)

function addSyslogServer() {
  if (!cfg.value) return
  cfg.value.syslogServers.push({ host: '', port: 514, facility: 'local7', level: 'informational' })
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
  font-size: 11.5px; color: #909399; margin-top: 4px; display: block;
}
.sub-section { margin: 10px 0; }
.sub-header {
  display: flex; align-items: center;
  font-size: 13px; font-weight: 600; color: var(--text-primary, #303133);
}
.syslog-card {
  display: flex; align-items: center;
  background: linear-gradient(135deg, #fdf2f9, #fef0f0);
  border: 1px solid #fbc4c4;
  border-radius: 8px; padding: 10px; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;
}
.list-enter-active, .list-leave-active { transition: all 0.25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
