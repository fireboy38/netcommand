// 设备厂商类型
export type VendorType = 'huawei' | 'ruijie' | 'h3c'

// 所有模块类型
export type ModuleType =
  | 'basic'       // 基础配置
  | 'vlan'        // VLAN配置
  | 'stp'         // STP/MSTP配置
  | 'dhcp'        // DHCP配置
  | 'route'       // 路由配置（静态/OSPF/RIP）
  | 'interface'   // 接口与聚合
  | 'remote'      // SSH/Telnet
  | 'snmp'        // SNMP管理
  | 'acl'         // ACL/QoS
  | 'ntp'         // NTP时间同步
  | 'log'          // 日志配置
  | 'custom'      // 自定义命令

// 模块信息
export interface ModuleInfo {
  key: ModuleType
  label: string
  icon: string
}

// ===== 基础配置 =====
export interface BasicConfig {
  enabled: boolean
  hostname: string
  banner: string
  enablePassword: string
  enableSecret: boolean
  consoleTimeout: number
  sysContact: string
  sysLocation: string
}

// ===== VLAN配置 =====
export interface VlanItem {
  id: string
  name: string
  description?: string
}

export interface VlanConfig {
  enabled: boolean
  vlans: VlanItem[]
}

// ===== STP/MSTP配置 =====
export interface StpConfig {
  enabled: boolean
  mode: 'stp' | 'rstp' | 'mstp'
  mstRegionName: string
  mstRevision: number
  mstInstances: { instance: number; vlans: string; priority: number }[]
  bridgePriority: number
  edgePorts: boolean
  bpduProtect: boolean
}

// ===== DHCP配置 =====
export interface DhcpPool {
  name: string
  network: string
  mask: string
  gateway: string
  dns1?: string
  dns2?: string
  leaseTime: string
  excludedIps: string
}

export interface DhcpConfig {
  enabled: boolean
  enableServer: boolean
  pools: DhcpPool[]
  relayInterfaces: { interface: string; serverIp: string }[]
}

// ===== 路由配置 =====
export interface StaticRoute {
  dest: string
  mask: string
  nextHop: string
  preference?: number
}

export interface OspfConfig {
  enabled: boolean
  processId: number
  routerId: string
  areas: { areaId: string; networks: { network: string; wildcard: string }[] }
  cost?: number
}

export interface RipConfig {
  enabled: boolean
  version: '1' | '2'
  networkIds: string[]
}

export interface RouteConfig {
  enabled: boolean
  staticRoutes: StaticRoute[]
  ospf: OspfConfig
  rip: RipConfig
}

// ===== 接口与聚合 =====
export interface InterfaceConfigItem {
  name: string
  description: string
  mode: 'access' | 'trunk' | 'hybrid'
  accessVlan: string
  trunkVlans: string
  speed: '' | '10' | '100' | '1000' | 'auto'
  duplex: '' | 'full' | 'half' | 'auto'
  status: 'up' | 'down'
  ipAddr: string
  mask: string
}

export interface EthTrunk {
  id: string
  mode: 'manual' | 'lacp-static' | 'lacp-dynamic'
  members: string[]
  description: string
}

export interface InterfaceConfig {
  enabled: boolean
  interfaces: InterfaceConfigItem[]
  trunks: EthTrunk[]
  portGroupEnabled: boolean
}

// ===== SSH/Telnet配置 =====
export interface RemoteConfig {
  enabled: boolean
  sshEnabled: boolean
  telnetEnabled: boolean
  sshVersion: '1' | '2' | 'all'
  sshPort: number
  telnetPort: number
  aaaNewModel: boolean
  authUsers: { username: string; password: string; privilege: number }[]
}

// ===== SNMP配置 =====
export interface SnmpCommunityItem {
  name: string
  permission: 'ro' | 'rw'
  acl?: string
}

export interface SnmpConfig {
  enabled: boolean
  enableAgent: boolean
  version: 'v1' | 'v2c' | 'v3'
  communities: SnmpCommunityItem[]
  sysContact: string
  sysLocation: string
  trapEnable: boolean
  trapServers: { host: string; port?: string }[]
  v3AuthUser?: string
  v3PrivProtocol?: 'des' | 'aes128'
}

// ===== ACL/QoS配置 =====
export interface AclRule {
  id: string
  action: 'permit' | 'deny'
  protocol: 'ip' | 'tcp' | 'udp' | 'icmp' | 'any'
  sourceIp: string
  sourceMask: string
  sourcePort?: string
  destIp: string
  destMask: string
  destPort?: string
  dscp?: string
}

export interface AclConfig {
  enabled: boolean
  rules: AclRule[]
  applyToInterfaces: { aclId: string; direction: 'inbound' | 'outbound'; interface: string }[]
  qosPolicyName: string
  rateLimitKbps: number
}

// ===== NTP配置 =====
export interface NtpConfig {
  enabled: boolean
  mode: 'client' | 'server'
  servers: string
  timezone: string
  summerTime: string
  authentication: boolean
  authKey?: string
}

// ===== 日志配置 =====
export interface SyslogServer {
  host: string
  port: number
  facility: string
  level: string
}

export interface LogConfig {
  enabled: boolean
  enableInfoCenter: boolean
  defaultLevel: string
  timestampFormat: 'date' | 'boot' | 'none'
  bufferSize: number
  enableSyslog: boolean
  syslogServers: SyslogServer[]
  saveToFlash: boolean
  maxLogFiles: number
  recordCommands: boolean
}

// ===== 自定义命令 =====
export interface CustomCommand {
  title: string
  commands: string
}

// ===== 标签页（设备） =====
export interface DeviceTab {
  id: string
  name: string
  vendor: VendorType
  basic: BasicConfig
  vlan: VlanConfig
  stp: StpConfig
  dhcp: DhcpConfig
  route: RouteConfig
  interfaceConf: InterfaceConfig
  remote: RemoteConfig
  snmp: SnmpConfig
  acl: AclConfig
  ntp: NtpConfig
  log: LogConfig
  customCommands: CustomCommand[]

  // 各模块启用状态
  moduleStates: Record<ModuleType, boolean>
}
