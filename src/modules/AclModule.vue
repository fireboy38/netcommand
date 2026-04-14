<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Filter /></el-icon>
      ACL / QoS 配置
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('acl', val)" />
    </div>

    <template v-if="cfg.enabled">
      <!-- ACL规则 -->
      <el-divider content-position="left">访问控制列表 (ACL)</el-divider>
      <TransitionGroup name="list" tag="div" class="acl-list">
        <div v-for="(rule, idx) in cfg.rules" :key="'a'+idx" class="acl-card">
          <div class="acl-header">
            <span :class="['action-tag', rule.action]">{{ rule.action.toUpperCase() }}</span>
            <el-button :icon="Delete" type="danger" text circle size="small"
              @click="cfg.rules.splice(idx,1)" />
          </div>
          <el-row :gutter="8" style="margin-top:8px;">
            <el-col :span="6">
              <el-select v-model="rule.protocol" size="small" style="width:100%">
                <el-option label="IP (任意)" value="ip" />
                <el-option label="TCP" value="tcp" />
                <el-option label="UDP" value="udp" />
                <el-option label="ICMP" value="icmp" />
              </el-select>
            </el-col>
            <el-col :span="9">
              <el-input v-model="rule.sourceIp" placeholder="源IP (any)" size="small"
                style="width:100%" />
            </el-col>
            <el-col :span="9">
              <el-input v-model="rule.destIp" placeholder="目标IP (any)" size="small"
                style="width:100%" />
            </el-col>
          </el-row>
          <el-row :gutter="8" style="margin-top:6px;">
            <el-col :span="12">
              <el-input v-model="rule.sourceMask" placeholder="源掩码 / 通配符" size="small"
                style="width:100%">
                <template #prefix><span style="font-size:10px;color:#909399">SrcMask</span></template>
              </el-input>
            </el-col>
            <el-col :span="12">
              <el-input v-model="rule.destMask" placeholder="目标掩码 / 通配符" size="small"
                style="width:100%">
                <template #prefix><span style="font-size:10px;color:#909399">DstMask</span></template>
              </el-input>
            </el-col>
          </el-row>
          <el-row :gutter="8" style="margin-top:6px;" v-if="rule.protocol === 'tcp' || rule.protocol === 'udp'">
            <el-col :span="12">
              <el-input v-model="rule.sourcePort" placeholder="源端口（可选）" size="small" style="width:100%" />
            </el-col>
            <el-col :span="12">
              <el-input v-model="rule.destPort" placeholder="目标端口（可选）" size="small" style="width:100%" />
            </el-col>
          </el-row>
        </div>
      </TransitionGroup>
      <el-space wrap>
        <el-button type="primary" plain size="default" @click="addRule('permit')">
          <el-icon><Plus /></el-icon> 添加 PERMIT 规则
        </el-button>
        <el-button type="danger" plain size="default" @click="addRule('deny')">
          <el-icon><Plus /></el-icon> 添加 DENY 规则
        </el-button>
      </el-space>

      <!-- 应用到接口 -->
      <el-divider content-position="left">应用ACL到接口</el-divider>
      <div v-for="(app, idx) in cfg.applyToInterfaces" :key="'ai'+idx" class="apply-row">
        <el-select v-model="app.direction" size="small" style="width:95px;">
          <el-option label="入方向" value="inbound" />
          <el-option label="出方向" value="outbound" />
        </el-select>
        <el-input v-model="app.interface" placeholder="接口名" size="small"
          style="flex:1;margin-left:6px;" />
        <el-button :icon="Delete" type="danger" text circle size="small"
          @click="cfg.applyToInterfaces.splice(idx,1)" style="margin-left:6px;" />
      </div>
      <el-button type="success" plain text size="default" @click="cfg.applyToInterfaces.push({ aclId: '', direction: 'inbound', interface: '' })"
        style="margin-top:8px;">
        <el-icon><Plus /></el-icon> 添加应用
      </el-button>

      <!-- QoS 限速 -->
      <el-divider content-position="left">QoS 限速</el-divider>
      <el-form-item label="启用限速" label-width="80px">
        <el-switch v-model="qosEnabled" active-text="" inactive-text="" />
      </el-form-item>
      <template v-if="qosEnabled">
        <el-form-item label="策略名称" label-width="80px" size="default">
          <el-input v-model="cfg.qosPolicyName" placeholder="LIMIT" size="default"
            style="max-width:200px" />
        </el-form-item>
        <el-form-item label="带宽限制" label-width="80px" size="default">
          <el-input-number v-model.number="cfg.rateLimitKbps" :min="64" :max="10000000" :step="1024"
            size="default"><template #suffix>Kbps</template></el-input-number>
        </el-form-item>
      </template>

      <!-- 预览 -->
      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('acl') || '<!-- 添加规则后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('acl')" v-if="store.generateModuleCommands('acl')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置ACL/QoS" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'
import { Delete, Plus, CopyDocument } from '@element-plus/icons-vue'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.acl)
const qosEnabled = ref(false)

function addRule(action: 'permit' | 'deny') {
  if (!cfg.value) return
  cfg.value.rules.push({
    id: String(cfg.value.rules.length + 3000),
    action,
    protocol: 'ip', sourceIp: 'any', sourceMask: '',
    destIp: 'any', destMask: '', sourcePort: undefined,
    destPort: undefined, dscp: undefined
  })
}

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.acl-list { margin-bottom: 10px; }
.acl-card {
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 14px; margin-bottom: 10px;
}
.acl-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 2px;
}
.action-tag {
  font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 4px;
  letter-spacing: 1px;
}
.action-tag.permit {
  background: #e1f3d8; color: #67c23a;
}
.action-tag.deny {
  background: #fde2e2; color: #f56c6c;
}
.apply-row {
  display: flex; align-items: center;
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 10px; margin-bottom: 6px;
}
.list-enter-active, .list-leave-active { transition: all 0.25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
