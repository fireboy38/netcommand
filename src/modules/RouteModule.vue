<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Promotion /></el-icon>
      路由配置
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('route', val)" />
    </div>

    <template v-if="cfg.enabled">
      <!-- 静态路由 -->
      <el-divider content-position="left">静态路由</el-divider>
      <TransitionGroup name="list" tag="div" class="route-list">
        <div v-for="(r, idx) in cfg.staticRoutes" :key="'s'+idx" class="route-item">
          <el-input v-model="r.dest" placeholder="目标网络 (0.0.0.0)" size="small"
            style="flex:1;margin-right:6px;" />
          <el-input v-model="r.mask" placeholder="掩码 (0.0.0.0)" size="small"
            style="width:120px;margin-right:6px;" />
          <el-input v-model="r.nextHop" placeholder="下一跳" size="small"
            style="width:130px;margin-right:6px;" />
          <el-input-number v-model.number="pref[idx]" :min="1" :max="255" size="small"
            style="width:80px;margin-right:6px;"
            @change="(v: number) => { r.preference = v }" />
          <el-button :icon="Delete" type="danger" text circle size="small"
            @click="removeStatic(idx)" />
        </div>
      </TransitionGroup>
      <el-button type="primary" plain text @click="addStatic" size="small">
        <el-icon><Plus /></el-icon> 添加静态路由
      </el-button>

      <!-- OSPF -->
      <el-divider content-position="left">
        <el-checkbox v-model="cfg.ospf.enabled">OSPF</el-checkbox>
      </el-divider>
      <template v-if="cfg.ospf.enabled">
        <el-form label-width="90px" size="default" class="config-form">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="进程ID" label-width="70px">
                <el-input-number v-model.number="cfg.ospf.processId" :min="1" :max="65535"
                  size="default" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Router ID" label-width="70px">
                <el-input v-model="cfg.ospf.routerId" placeholder="1.1.1.1" size="default"
                  style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <!-- 区域配置 -->
          <div class="sub-section">
            <div class="sub-header">
              <span>区域</span>
              <el-button type="primary" text size="small" @click="addArea">
                <el-icon :size="13"><Plus /></el-icon> 添加
              </el-button>
            </div>
            <div v-for="(area, aIdx) in cfg.ospf.areas.areas" :key="aIdx" class="area-card">
              <div class="area-top">
                <el-select v-model="area.areaId" size="small" style="width:100px;">
                  <el-option label="0 (骨干区)" value="0" />
                  <el-option label="1" value="1" />
                  <el-option label="2" value="2" />
                  <el-option label="10" value="10" />
                  <el-option label="20" value="20" />
                </el-select>
                <el-input v-model="newNetwork[aIdx]" placeholder="网段+通配符掩码"
                  size="small" style="flex:1;margin-left:8px;" />
                <el-button type="primary" text size="small" @click="addNetwork(aIdx)"
                  style="margin-left:4px;">添加网段</el-button>
                <el-button :icon="Delete" type="danger" text circle size="small"
                  @click="cfg.ospf.areas.areas.splice(aIdx,1)"
                  :disabled="cfg.ospf.areas.areas.length <= 1" />
              </div>
              <div v-for="(n, nIdx) in area.networks" :key="nIdx"
                class="network-tag">
                {{ n.network }} / {{ n.wildcard }}
                <el-icon @click="area.networks.splice(nIdx,1)" class="tag-close"><Close /></el-icon>
              </div>
            </div>
          </div>
        </el-form>
      </template>

      <!-- RIP -->
      <el-divider content-position="left">
        <el-checkbox v-model="cfg.rip.enabled">RIP</el-checkbox>
      </el-divider>
      <template v-if="cfg.rip.enabled">
        <el-form label-width="90px" size="default" class="config-form">
          <el-form-item label="版本" label-width="70px">
            <el-radio-group v-model="cfg.rip.version" size="default">
              <el-radio value="1">RIPv1</el-radio>
              <el-radio value="2">RIPv2</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="宣告网络" label-width="70px">
            <div class="rip-networks">
              <el-tag v-for="(nid, idx) in cfg.rip.networkIds" :key="idx" closable
                type="info" @close="cfg.rip.networkIds.splice(idx,1)"
                style="margin:0 4px 4px 0;">{{ nid }}</el-tag>
              <el-input v-model="ripInput" placeholder="输入网段回车添加" size="small"
                style="width:160px;" @keyup.enter="addRipNet" clearable />
            </div>
          </el-form-item>
        </el-form>
      </template>

      <!-- 预览 -->
      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('route') || '<!-- 配置后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('route')" v-if="store.generateModuleCommands('route')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置路由" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'
import { Delete, Plus, CopyDocument, Promotion, Close } from '@element-plus/icons-vue'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.route)
const pref = ref<number[]>([])
const ripInput = ref('')
const newNetwork = ref<string[]>([])

function addStatic() {
  if (!cfg.value) return
  cfg.value.staticRoutes.push({ dest: '', mask: '', nextHop: '', preference: undefined })
  pref.value.push(60)
}
function removeStatic(idx: number) {
  cfg.value?.staticRoutes.splice(idx, 1)
  pref.value.splice(idx, 1)
}

function addArea() {
  if (!cfg.value?.ospf.areas.areas.length) return
  cfg.value.ospf.areas.areas.push({ areaId: '0', networks: [] })
  newNetwork.value.push('')
}

function addNetwork(aIdx: number) {
  const input = newNetwork.value[aIdx]
  if (!input || !input.trim()) return
  const parts = input.trim().split(/\s+/)
  if (parts.length >= 2) {
    cfg.value?.ospf.areas.areas[aIdx].networks.push({
      network: parts[0], wildcard: parts[1]
    })
    newNetwork.value[aIdx] = ''
  } else {
    ElMessage.warning('格式：网段 通配符掩码，空格分隔')
  }
}

function addRipNet() {
  const val = ripInput.value.trim()
  if (!val || !cfg.value) return
  cfg.value.rip.networkIds.push(val)
  ripInput.value = ''
}

async function copyModule(mod: string) {
  const cmd = store.generateModuleCommands(mod as any)
  if (!cmd) return
  try { await navigator.clipboard.writeText(cmd); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.route-list { margin-bottom: 8px; }
.route-item {
  display: flex; align-items: center;
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 10px; margin-bottom: 6px;
}
.sub-section { margin: 12px 0; }
.sub-header {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;
}
.area-card {
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 12px; margin-bottom: 8px;
}
.area-top { display: flex; align-items: center; margin-bottom: 8px; }
.network-tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: #ecf5ff; color: #409eff; padding: 3px 8px;
  border-radius: 4px; font-size: 12px; font-family: monospace;
  margin: 2px 4px 2px 0;
}
.tag-close { cursor: pointer; opacity: 0.5; }
.tag-close:hover { opacity: 1; }
.rip-networks {
  display: flex; align-items: center; flex-wrap: wrap;
}
.list-enter-active, .list-leave-active { transition: all 0.25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
