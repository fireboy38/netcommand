<template>
  <div class="module-card">
    <div class="module-title">
      <el-icon><Monitor /></el-icon>
      DHCP 配置
      <el-switch v-model="cfg.enabled" size="small" style="margin-left:auto"
        @change="(val: boolean) => store.toggleModule('dhcp', val)" />
    </div>

    <template v-if="cfg.enabled">
      <el-form label-width="100px" size="default" class="config-form">
        <el-form-item label="DHCP服务">
          <el-switch v-model="cfg.enableServer" active-text="" inactive-text=""
            @change="onChange">
            <template #active-text>服务器</template>
            <template #inactive-text>中继</template>
          </el-switch>
        </el-form-item>

        <!-- 地址池 -->
        <template v-if="cfg.enableServer">
          <el-divider content-position="left">地址池</el-divider>
          <TransitionGroup name="list" tag="div" class="pool-list">
            <div v-for="(p, idx) in cfg.pools" :key="idx" class="pool-card">
              <div class="pool-header">
                <span class="pool-title">地址池 #{{ idx + 1 }} - {{ p.name }}</span>
                <el-button :icon="Delete" type="danger" text circle size="small"
                  @click="cfg.pools.splice(idx,1)"
                  :disabled="cfg.pools.length <= 1" />
              </div>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="网络地址" label-width="70px" size="default">
                    <el-input v-model="p.network" placeholder="192.168.1.0" size="default"
                      @change="onChange" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="子网掩码" label-width="70px" size="default">
                    <el-input v-model="p.mask" placeholder="255.255.255.0" size="default"
                      @change="onChange" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="网关" label-width="70px" size="default">
                    <el-input v-model="p.gateway" placeholder="192.168.1.1" size="default"
                      @change="onChange" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="租期(天)" label-width="70px" size="default">
                    <el-input-number v-model.number="leaseDays[idx]" :min="1" :max="365"
                      size="default" @change="(v: number) => { p.leaseTime = String(v) }" style="width:100%" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="DNS1" label-width="70px" size="default">
                    <el-input v-model="p.dns1" placeholder="114.114.114.114" size="default"
                      @change="onChange" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="DNS2" label-width="70px" size="default">
                    <el-input v-model="p.dns2" placeholder="8.8.8.8 (可选)" size="default"
                      @change="onChange" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="排除IP" label-width="70px" size="default">
                <el-input v-model="p.excludedIps"
                  placeholder="排除的IP，逗号分隔 (例: 192.168.1.200-254)"
                  size="default" @change="onChange" />
              </el-form-item>
            </div>
          </TransitionGroup>

          <el-button type="primary" plain size="default" @click="addPool" style="margin-top:10px">
            <el-icon><Plus /></el-icon> 添加地址池
          </el-button>
        </template>

        <!-- 中继 -->
        <template v-else>
          <el-divider content-position="left">DHCP 中继</el-divider>
          <div v-for="(r, idx) in cfg.relayInterfaces" :key="idx" class="relay-row">
            <el-input v-model="r.interface" placeholder="接口名 (Vlanif10)" size="default"
              style="flex:1;margin-right:8px;" @change="onChange" />
            <el-input v-model="r.serverIp" placeholder="DHCP服务器IP" size="default"
              style="flex:1;margin-right:8px;" @change="onChange" />
            <el-button :icon="Delete" type="danger" text circle size="small"
              @click="cfg.relayInterfaces.splice(idx,1)" />
          </div>
          <el-button type="primary" plain size="default" @click="addRelay" style="margin-top:10px">
            <el-icon><Plus /></el-icon> 添加中继
          </el-button>
        </template>
      </el-form>

      <el-divider content-position="left">命令预览</el-divider>
      <div class="module-preview">
        <pre class="code-block">{{ store.generateModuleCommands('dhcp') || '<!-- 配置后自动生成 -->' }}</pre>
        <el-button size="small" text type="primary" style="margin-top:8px"
          @click="copyModule('dhcp')" v-if="store.generateModuleCommands('dhcp')">
          <el-icon :size="13"><CopyDocument /></el-icon> 复制本模块
        </el-button>
      </div>
    </template>

    <el-empty v-else description="开启此模块以配置DHCP" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigStore } from '../store/config'
import { ElMessage } from 'element-plus'
import { Delete, Plus, CopyDocument, Monitor } from '@element-plus/icons-vue'

const store = useConfigStore()
const cfg = computed(() => store.activeTab?.dhcp)
const leaseDays = ref<number[]>([3])

function addPool() {
  if (!cfg.value) return
  const num = cfg.value.pools.length + 1
  cfg.value.pools.push({
    name: `POOL${num}`,
    network: '', mask: '', gateway: '',
    dns1: '', dns2: '', leaseTime: '3', excludedIps: ''
  })
  leaseDays.value.push(3)
}

function addRelay() {
  if (!cfg.value) return
  cfg.value.relayInterfaces.push({ interface: '', serverIp: '' })
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
.pool-card {
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 16px; margin-bottom: 10px;
}
.pool-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.pool-title { font-weight: 600; font-size: 13px; color: var(--text-primary); }
.relay-row {
  display: flex; align-items: center;
  background: #fafbfc; border: 1px solid #e4e7ed;
  border-radius: 8px; padding: 10px; margin-bottom: 8px;
}
.list-enter-active, .list-leave-active { transition: all 0.25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
