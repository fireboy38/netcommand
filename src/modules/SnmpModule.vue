<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Monitor /></el-icon>
      SNMP 网络管理
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('snmp', val)" />
    </div>

    <template v-if="cfg.enabled">
      <el-form label-width="110px" size="default" class="config-form">
        <!-- 基本开关 -->
        <el-form-item label="启用SNMP Agent">
          <el-switch v-model="cfg.enableAgent" active-text="开启" inactive-text="关闭" />
        </el-form-item>

        <!-- 版本选择 -->
        <el-form-item label="SNMP版本">
          <el-radio-group v-model="cfg.version" size="default">
            <el-radio value="v1">SNMPv1</el-radio>
            <el-radio value="v2c">SNMPv2c</el-radio>
            <el-radio value="v3">SNMPv3</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- Community（v1/v2c） -->
        <template v-if="cfg.version !== 'v3'">
          <el-divider content-position="left">Community 配置</el-divider>
          <div class="sub-section">
            <div class="sub-header">
              <span>社区名列表</span>
              <el-button type="primary" text size="small" @click="addCommunity"
                style="margin-left:auto"><el-icon :size="13"><Plus /></el-icon> 添加</el-button>
            </div>
            <TransitionGroup name="list" tag="div">
              <div v-for="(c, idx) in cfg.communities" :key="'c'+idx" class="comm-card">
                <el-input v-model="c.name" placeholder="community名称（如public/private）" size="small"
                  style="flex:1;margin-right:6px;" />
                <el-select v-model="c.permission" size="small" style="width:90px;margin-right:6px;">
                  <el-option label="只读(RO)" value="ro" />
                  <el-option label="读写(RW)" value="rw" />
                </el-select>
                <el-input v-model="c.acl" placeholder="ACL(可选)" size="small"
                  style="flex:0.8;margin-right:6px;" />
                <el-button :icon="Delete" type="danger" text circle size="small"
                  @click="cfg.communities.splice(idx,1)"
                  :disabled="cfg.communities.length <= 1" />
              </div>
            </TransitionGroup>
            <span class="form-hint">RO=只读权限，RW=读写权限。生产环境建议使用自定义强密码作为社区名。</span>
          </div>
        </template>

        <!-- v3 用户配置提示 -->
        <template v-if="cfg.version === 'v3'">
          <el-alert title="SNMPv3 需要手动配置认证/加密参数，建议通过CLI完成详细配置，此处仅生成基础启用命令。" type="info" :closable="false" show-icon style="margin-bottom:12px;" />
          <el-form-item label="V3认证用户" label-width="110px">
            <el-input v-model="cfg.v3AuthUser" placeholder="输入用户名（可选）" size="small" style="max-width:260px;" />
          </el-form-item>
          <el-form-item label="加密协议" label-width="110px">
            <el-select v-model="cfg.v3PrivProtocol" clearable placeholder="默认不加密" size="small" style="max-width:200px;">
              <el-option label="DES" value="des" />
              <el-option label="AES-128" value="aes128" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 系统信息 -->
        <el-divider content-position="left">系统信息</el-divider>
        <el-form-item label="联系信息">
          <el-input v-model="cfg.sysContact" placeholder="sysContact（如：Network Admin）" size="default" />
        </el-form-item>
        <el-form-item label="位置信息">
          <el-input v-model="cfg.sysLocation" placeholder="sysLocation（如：Beijing IDC）" size="default" />
        </el-form-item>

        <!-- Trap配置 -->
        <el-divider content-position="left">Trap 告警</el-divider>
        <el-form-item label="启用Trap">
          <el-switch v-model="cfg.trapEnable" />
        </el-form-item>
        <template v-if="cfg.trapEnable">
          <div class="sub-section">
            <div class="sub-header">
              <span>Trap 目标服务器</span>
              <el-button type="primary" text size="small" @click="addTrapServer"
                style="margin-left:auto"><el-icon :size="13"><Plus /></el-icon> 添加</el-button>
            </div>
            <TransitionGroup name="list" tag="div">
              <div v-for="(t, idx) in cfg.trapServers" :key="'t'+idx" class="trap-card">
                <el-input v-model="t.host" placeholder="目标主机IP或域名" size="small"
                  style="flex:1;margin-right:6px;" />
                <el-input-number v-model.number="t.port" :min="1" :max="65535" placeholder="端口"
                  size="small" :controls="false" style="width:100px;margin-right:6px;" />
                <el-button :icon="Delete" type="danger" text circle size="small"
                  @click="cfg.trapServers.splice(idx,1)" />
              </div>
            </TransitionGroup>
            <span class="form-hint">默认UDP端口162。</span>
          </div>
        </template>
      </el-form>

      <!-- 预览 -->
      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('snmp') || '<!-- 配置后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('snmp')" v-if="store.generateModuleCommands('snmp')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置SNMP网络管理" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.snmp)

function addCommunity() {
  if (!cfg.value) return
  cfg.value.communities.push({ name: '', permission: 'ro', acl: '' })
}

function addTrapServer() {
  if (!cfg.value) return
  cfg.value.trapServers.push({ host: '', port: 162 })
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
.comm-card {
  display: flex; align-items: center;
  background: linear-gradient(135deg, #f0f9eb, #ecf5ff);
  border: 1px solid #b3d8ff;
  border-radius: 8px; padding: 10px; margin-bottom: 6px;
}
.trap-card {
  display: flex; align-items: center;
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 10px; margin-bottom: 6px;
}
.list-enter-active, .list-leave-active { transition: all 0.25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
