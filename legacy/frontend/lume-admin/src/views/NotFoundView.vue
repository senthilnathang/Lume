<template>
  <div class="not-found-container">
    <a-result
      status="404"
      title="404 Page Not Found"
      sub-title="The page you're looking for doesn't exist"
    >
      <template #extra>
        <a-button type="primary" @click="$router.push('/')">Go Home</a-button>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
</style>
