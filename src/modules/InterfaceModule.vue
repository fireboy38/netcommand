<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Connection /></el-icon>
      接口与聚合
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('interfaceConf', val)" />
    </div>

    <template v-if="cfg.enabled">
      <!-- 接口列表 -->
      <el-divider content-position="left">端口配置</el-divider>
      <TransitionGroup name="list" tag="div" class="intf-list">
        <div v-for="(intf, idx) in cfg.interfaces" :key="'i'+idx" class="intf-card">
          <div class="intf-header">
            <span class="intf-name">{{ intf.name || `接口 ${idx + 1}` }}</span>
            <el-button :icon="Delete" type="danger" text circle size="small"
              @click="cfg.interfaces.splice(idx,1)"
              :disabled="cfg.interfaces.length <= 1" />
          </div>
          <el-row :gutter="10" class="intf-form">
            <el-col :span="8">
              <el-input v-model="intf.name" placeholder="GigabitEthernet0/0/1"
                size="small"><template #prefix><span style="font-size:10px;color:#909399">接口</span></template></el-input>
            </el-col>
            <el-col :span="8">
              <el-select v-model="intf.mode" size="small" style="width:100%">
                <el-option label="Access" value="access" />
                <el-option label="Trunk" value="trunk" />
                <el-option label="Hybrid" value="hybrid" />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-select v-model="intf.status" size="small" style="width:100%">
                <el-option label="启用 (up)" value="up" />
                <el-option label="关闭 (down)" value="down" />
              </el-select>
            </el-col>
          </el-row>
          <el-row :gutter="10" class="intf-form" v-if="intf.mode === 'access' && intf.mode === 'access'">
            <el-col :span="12">
              <el-input v-model="intf.accessVlan" placeholder="Access VLAN ID"
                size="small"><template #prefix><span style="font-size:10px;color:#909399">AVLAN</span></template></el-input>
            </el-col>
            <el-col :span="12">
              <el-input v-model="intf.trunkVlans" placeholder="Trunk VLAN (all 或 10,20,30)"
                size="small"><template #prefix><span style="font-size:10px;color:#909399">TVLANS</span></template></el-input>
            </el-col>
          </el-row>
          <el-row :gutter="10" class="intf-form">
            <el-col :span="6">
              <el-select v-model="intf.speed" clearable placeholder="速率" size="small" style="width:100%">
                <el-option label="Auto" value="auto" />
                <el-option label="10Mbps" value="10" />
                <el-option label="100Mbps" value="100" />
                <el-option label="1000Mbps" value="1000" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-select v-model="intf.duplex" clearable placeholder="双工" size="small" style="width:100%">
                <el-option label="Auto" value="auto" />
                <el-option label="Full" value="full" />
                <el-option label="Half" value="half" />
              </el-select>
            </el-col>
            <el-col :span="12">
              <el-input v-model="intf.description" placeholder="描述信息（可选）" size="small" />
            </el-col>
          </el-row>
          <!-- 三层接口IP -->
          <el-collapse-transition>
            <div v-if="showIp[idx]" class="ip-config-row" :key="'ip'+idx">
              <el-input v-model="intf.ipAddr" placeholder="IP地址" size="small" style="flex:1;margin-right:6px;" />
              <span style="color:#909399;font-size:12px;">/</span>
              <el-input v-model="intf.mask" placeholder="掩码" size="small" style="flex:1;margin-left:6px;" />
            </div>
          </el-collapse-transition>
          <el-button type="primary" text size="small" @click="toggleIp(idx)">
            {{ showIp[idx] ? '隐藏' : '配置' }}三层接口 IP
          </el-button>
        </div>
      </TransitionGroup>
      <el-button type="primary" plain @click="addInterface" size="default" style="margin-top:10px;">
        <el-icon><Plus /></el-icon> 添加接口
      </el-button>

      <!-- 聚合口 -->
      <el-divider content-position="left">链路聚合 (Eth-Trunk)</el-divider>
      <TransitionGroup name="list" tag="div" class="trunk-list">
        <div v-for="(t, tIdx) in cfg.trunks" :key="'t'+tIdx" class="trunk-card">
          <div class="trunk-header">
            <span class="trunk-title">{{ vendorTrunkName }} {{ t.id }}</span>
            <el-button :icon="Delete" type="danger" text circle size="small"
              @click="cfg.trunks.splice(tIdx,1)" />
          </div>
          <el-row :gutter="10" style="margin-bottom:8px;">
            <el-col :span="8">
              <el-input-number v-model.number="t.id" :min="1" :max="64" size="small"
                style="width:100%"><template #prepend>ID</template></el-input-number>
            </el-col>
            <el-col :span="14">
              <el-select v-model="t.mode" size="small" style="width:100%">
                <el-option label="手动负载分担" value="manual" />
                <el-option label="LACP静态" value="lacp-static" />
                <el-option label="LACP动态" value="lacp-dynamic" />
              </el-select>
            </el-col>
          </el-row>
          <el-input v-model="t.description" placeholder="描述（可选）" size="small" style="margin-bottom:8px;" />
          <div class="member-list">
            <el-tag v-for="(m, mIdx) in t.members" :key="mIdx" closable type="warning"
              @close="t.members.splice(mIdx,1)" style="margin:2px 4px 2px 0;">{{ m }}</el-tag>
            <el-input v-model="memberInput[tIdx]" placeholder="输入成员接口回车添加" size="small"
              style="width:180px;" @keyup.enter="(e: any) => { addMember(tIdx, e.target.value); memberInput[tIdx]='' }" clearable />
          </div>
        </div>
      </TransitionGroup>
      <el-button type="success" plain @click="addTrunk" size="default" style="margin-top:10px;">
        <el-icon><Plus /></el-icon> 添加聚合口
      </el-button>

      <!-- 预览 -->
      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('interfaceConf') || '<!-- 配置后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('interfaceConf')" v-if="store.generateModuleCommands('interfaceConf')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置接口与聚合" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'
import { Delete, Plus, CopyDocument, Connection } from '@element-plus/icons-vue'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.interfaceConf)
const showIp = ref<boolean[]>([])
const memberInput = ref<string[]>([])

const vendorTrunkName = computed(() => {
  const v = store.activeTab?.vendor
  if (v === 'ruijie') return 'Port-channel'
  if (v === 'h3c') return 'Bridge-Aggregation'
  return 'Eth-Trunk'
})

function addInterface() {
  if (!cfg.value) return
  cfg.value.interfaces.push({
    name: '', description: '', mode: 'access', accessVlan: '',
    trunkVlans: 'all', speed: '', duplex: '', status: 'up', ipAddr: '', mask: ''
  })
  showIp.value.push(false)
}

function toggleIp(idx: number) {
  showIp.value[idx] = !showIp.value[idx]
}

function addTrunk() {
  if (!cfg.value) return
  const num = cfg.value.trunks.length + 1
  cfg.value.trunks.push({ id: String(num), mode: 'manual', members: [], description: '' })
  memberInput.value.push('')
}

function addMember(tIdx: number, val: string) {
  if (!val?.trim() || !cfg.value) return
  cfg.value.trunks[tIdx].members.push(val.trim())
}

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.intf-list { margin-bottom: 8px; }
.intf-card {
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 14px; margin-bottom: 10px;
}
.intf-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.intf-name { font-weight: 600; font-size: 13px; color: var(--accent-color); font-family: monospace; }
.intf-form { margin-top: 6px; }
.ip-config-row { display: flex; align-items: center; margin: 6px 0; }

.trunk-list { margin-bottom: 8px; }
.trunk-card {
  background: linear-gradient(135deg, #fef9e7, #fff8e1);
  border: 1px solid #ffe082;
  border-radius: 8px; padding: 14px; margin-bottom: 10px;
}
.trunk-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.trunk-title { font-weight: 600; font-size: 13px; color: #e6a23c; font-family: monospace; }
.member-list {
  display: flex; align-items: center; flex-wrap: wrap;
}
.list-enter-active, .list-leave-active { transition: all 0.25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
