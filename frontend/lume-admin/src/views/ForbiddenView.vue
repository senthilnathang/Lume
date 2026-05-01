<template>
  <div class="forbidden-container">
    <a-result
      status="403"
      title="403 Forbidden"
      sub-title="You don't have permission to access this resource"
    >
      <template #extra>
        <a-button type="primary" @click="$router.back">Go Back</a-button>
        <a-button @click="$router.push('/')">Go Home</a-button>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.forbidden-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
</style>
