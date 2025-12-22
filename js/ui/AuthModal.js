// AuthModal - Authentication modal for login and create account
class AuthModal {
    constructor(firebaseManager, onAuthSuccess = null) {
        this.firebaseManager = firebaseManager;
        this.onAuthSuccess = onAuthSuccess;
        this.modal = document.getElementById('authModal');
        this.isLoginMode = true; // true = login, false = create account
        
        // Login elements
        this.loginEmailInput = document.getElementById('authLoginEmail');
        this.loginPasswordInput = document.getElementById('authLoginPassword');
        this.loginBtn = document.getElementById('authLoginBtn');
        this.loginErrorMsg = document.getElementById('authLoginError');
        
        // Create account elements
        this.createEmailInput = document.getElementById('authCreateEmail');
        this.createPasswordInput = document.getElementById('authCreatePassword');
        this.createConfirmPasswordInput = document.getElementById('authCreateConfirmPassword');
        this.createBtn = document.getElementById('authCreateBtn');
        this.createErrorMsg = document.getElementById('authCreateError');
        
        // Toggle elements
        this.toggleToCreateBtn = document.getElementById('authToggleToCreate');
        this.toggleToLoginBtn = document.getElementById('authToggleToLogin');
        this.loginForm = document.getElementById('authLoginForm');
        this.createForm = document.getElementById('authCreateForm');
        
        // Close button
        this.closeBtn = document.getElementById('authModalClose');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Create account form
        if (this.createBtn) {
            this.createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCreateAccount();
            });
        }

        if (this.createForm) {
            this.createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateAccount();
            });
        }

        // Toggle between login and create
        if (this.toggleToCreateBtn) {
            this.toggleToCreateBtn.addEventListener('click', () => {
                this.switchToCreateMode();
            });
        }

        if (this.toggleToLoginBtn) {
            this.toggleToLoginBtn.addEventListener('click', () => {
                this.switchToLoginMode();
            });
        }

        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    // Don't allow closing by clicking backdrop - login is required
                }
            });
        }

        // Enter key handling
        if (this.loginPasswordInput) {
            this.loginPasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        if (this.createConfirmPasswordInput) {
            this.createConfirmPasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleCreateAccount();
                }
            });
        }
    }

    show(loginMode = true) {
        if (!this.modal) return;
        
        this.isLoginMode = loginMode;
        this.modal.classList.remove('hidden');
        
        // Reset forms
        this.clearErrors();
        this.resetForms();
        
        // Show appropriate form
        if (loginMode) {
            this.switchToLoginMode();
        } else {
            this.switchToCreateMode();
        }
        
        // Focus on first input
        setTimeout(() => {
            if (loginMode && this.loginEmailInput) {
                this.loginEmailInput.focus();
            } else if (!loginMode && this.createEmailInput) {
                this.createEmailInput.focus();
            }
        }, 100);
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }

    switchToLoginMode() {
        this.isLoginMode = true;
        if (this.loginForm) {
            this.loginForm.classList.remove('hidden');
        }
        if (this.createForm) {
            this.createForm.classList.add('hidden');
        }
        this.clearErrors();
    }

    switchToCreateMode() {
        this.isLoginMode = false;
        if (this.loginForm) {
            this.loginForm.classList.add('hidden');
        }
        if (this.createForm) {
            this.createForm.classList.remove('hidden');
        }
        this.clearErrors();
    }

    async handleLogin() {
        const email = this.loginEmailInput?.value.trim();
        const password = this.loginPasswordInput?.value;

        // Validation
        if (!email) {
            this.showLoginError('Voer een e-mailadres in.');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showLoginError('Voer een geldig e-mailadres in.');
            return;
        }

        if (!password) {
            this.showLoginError('Voer een wachtwoord in.');
            return;
        }

        if (password.length < 6) {
            this.showLoginError('Wachtwoord moet minimaal 6 karakters lang zijn.');
            return;
        }

        // Show loading state
        this.setLoginLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.signIn(email, password);
            
            if (result.success) {
                this.clearErrors();
                this.hide();
                if (this.onAuthSuccess) {
                    this.onAuthSuccess(result.user);
                }
            } else {
                this.showLoginError(result.error || 'Inloggen mislukt.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Er is een fout opgetreden. Probeer het opnieuw.');
        } finally {
            this.setLoginLoading(false);
        }
    }

    async handleCreateAccount() {
        const email = this.createEmailInput?.value.trim();
        const password = this.createPasswordInput?.value;
        const confirmPassword = this.createConfirmPasswordInput?.value;

        // Validation
        if (!email) {
            this.showCreateError('Voer een e-mailadres in.');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showCreateError('Voer een geldig e-mailadres in.');
            return;
        }

        if (!password) {
            this.showCreateError('Voer een wachtwoord in.');
            return;
        }

        if (password.length < 6) {
            this.showCreateError('Wachtwoord moet minimaal 6 karakters lang zijn.');
            return;
        }

        if (password !== confirmPassword) {
            this.showCreateError('Wachtwoorden komen niet overeen.');
            return;
        }

        // Show loading state
        this.setCreateLoading(true);
        this.clearErrors();

        try {
            const result = await this.firebaseManager.signUp(email, password);
            
            if (result.success) {
                this.clearErrors();
                this.hide();
                if (this.onAuthSuccess) {
                    this.onAuthSuccess(result.user);
                }
            } else {
                this.showCreateError(result.error || 'Account aanmaken mislukt.');
            }
        } catch (error) {
            console.error('Create account error:', error);
            this.showCreateError('Er is een fout opgetreden. Probeer het opnieuw.');
        } finally {
            this.setCreateLoading(false);
        }
    }

    showLoginError(message) {
        if (this.loginErrorMsg) {
            this.loginErrorMsg.textContent = message;
            this.loginErrorMsg.classList.remove('hidden');
        }
    }

    showCreateError(message) {
        if (this.createErrorMsg) {
            this.createErrorMsg.textContent = message;
            this.createErrorMsg.classList.remove('hidden');
        }
    }

    clearErrors() {
        if (this.loginErrorMsg) {
            this.loginErrorMsg.textContent = '';
            this.loginErrorMsg.classList.add('hidden');
        }
        if (this.createErrorMsg) {
            this.createErrorMsg.textContent = '';
            this.createErrorMsg.classList.add('hidden');
        }
    }

    setLoginLoading(loading) {
        if (this.loginBtn) {
            this.loginBtn.disabled = loading;
            if (loading) {
                this.loginBtn.textContent = 'Inloggen...';
            } else {
                this.loginBtn.textContent = 'Inloggen';
            }
        }
        if (this.loginEmailInput) {
            this.loginEmailInput.disabled = loading;
        }
        if (this.loginPasswordInput) {
            this.loginPasswordInput.disabled = loading;
        }
    }

    setCreateLoading(loading) {
        if (this.createBtn) {
            this.createBtn.disabled = loading;
            if (loading) {
                this.createBtn.textContent = 'Account aanmaken...';
            } else {
                this.createBtn.textContent = 'Account aanmaken';
            }
        }
        if (this.createEmailInput) {
            this.createEmailInput.disabled = loading;
        }
        if (this.createPasswordInput) {
            this.createPasswordInput.disabled = loading;
        }
        if (this.createConfirmPasswordInput) {
            this.createConfirmPasswordInput.disabled = loading;
        }
    }

    resetForms() {
        if (this.loginEmailInput) {
            this.loginEmailInput.value = '';
        }
        if (this.loginPasswordInput) {
            this.loginPasswordInput.value = '';
        }
        if (this.createEmailInput) {
            this.createEmailInput.value = '';
        }
        if (this.createPasswordInput) {
            this.createPasswordInput.value = '';
        }
        if (this.createConfirmPasswordInput) {
            this.createConfirmPasswordInput.value = '';
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

