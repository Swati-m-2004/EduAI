import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import './InputField.css';

export default function InputField({
  label,
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  icon: Icon,
  showPasswordToggle = false,
  onPasswordToggle,
  showPassword,
}) {
  return (
    <div className="input-group">
      {label && <label className="input-label" htmlFor={name}>{label}</label>}
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" />}
        <input
          id={name}
          name={name}
          type={showPasswordToggle && showPassword ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`input-field ${error ? 'error' : ''} ${Icon ? 'with-icon' : ''}`}
          autoComplete="off"
        />
        {showPasswordToggle && (
          <button
            type="button"
            className="password-toggle"
            onClick={onPasswordToggle}
            tabIndex="-1"
          >
            {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
          </button>
        )}
      </div>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
